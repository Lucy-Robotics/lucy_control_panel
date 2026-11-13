/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMeshCache, meshRoute, resolveMeshFile } from '../server/meshRoute.ts';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mesh-route-'));
const root = path.join(tmp, 'root');
const outside = path.join(tmp, 'outside');
await fs.mkdir(root);
await fs.mkdir(outside);
const stl = path.join(root, 'a.stl');
await fs.writeFile(stl, 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 2 0 0\nvertex 0 3 1\nendloop\nendfacet\nendsolid t\n');
await fs.writeFile(path.join(root, 'notes.txt'), 'x');
await fs.writeFile(path.join(outside, 'secret.stl'), 'x');
await fs.symlink(path.join(outside, 'secret.stl'), path.join(root, 'link.stl'));

async function statusOf(ref: string | null): Promise<number | undefined> {
    return resolveMeshFile(ref, [root]).then(() => undefined, (e: { status?: number }) => e.status);
}

async function resolveMeshFileRejectsBadRequests() {
    assert.equal(await statusOf(null), 400, 'missing path is 400');
    assert.equal(await statusOf(path.join(root, 'notes.txt')), 403, 'non-mesh extension is 403');
    assert.equal(await statusOf(path.join(root, 'gone.stl')), 404, 'missing file is 404');
    assert.equal(await statusOf(path.join(outside, 'secret.stl')), 403, 'file outside the roots is 403');
    assert.equal(await statusOf(path.join(root, 'link.stl')), 403, 'symlink escaping the root is 403');
}

async function resolveMeshFileAcceptsFilesInsideTheRoot() {
    const real = await fs.realpath(stl);
    assert.equal(await resolveMeshFile(stl, [root]), real, 'absolute path resolves');
    assert.equal(await resolveMeshFile(`file://${stl}`, [root]), real, 'file:// URL resolves');
}

function countingConvert() {
    const state = { calls: 0 };
    const convert = async () => {
        state.calls++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new TextEncoder().encode('glb').buffer as ArrayBuffer;
    };
    return { state, convert };
}

async function concurrentRequestsConvertOnce() {
    const { state, convert } = countingConvert();
    const glbOf = createMeshCache(path.join(tmp, 'c1'), convert);
    const [a, b] = await Promise.all([glbOf(stl), glbOf(stl)]);
    assert.equal(state.calls, 1, 'two concurrent requests convert once');
    assert.equal(a.etag, b.etag, 'both requests share the etag');
}

async function diskCacheSurvivesANewCacheInstance() {
    const { state, convert } = countingConvert();
    const dir = path.join(tmp, 'c2');
    await createMeshCache(dir, convert)(stl);
    await createMeshCache(dir, convert)(stl);
    assert.equal(state.calls, 1, 'a new cache instance reuses the disk cache');
}

async function changedMtimeReconverts() {
    const { state, convert } = countingConvert();
    const glbOf = createMeshCache(path.join(tmp, 'c3'), convert);
    const before = await glbOf(stl);
    await fs.utimes(stl, new Date(), new Date(Date.now() + 60_000));
    const after = await glbOf(stl);
    assert.equal(state.calls, 2, 'a changed mtime reconverts');
    assert.notEqual(before.etag, after.etag, 'a changed mtime changes the etag');
}

type Handler = (req: unknown, res: unknown, next: () => void) => void;

async function request(url: string, headers: Record<string, string> = {}) {
    let handler: Handler = () => {};
    const plugin = meshRoute([root], path.join(tmp, 'c4'));
    (plugin.configureServer as (s: unknown) => void)({ middlewares: { use: (h: Handler) => (handler = h) } });
    const res = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown, setHeader(k: string, v: string) { this.headers[k] = v; }, end(b?: unknown) { this.body = b; done(); } };
    let done = () => {};
    const finished = new Promise<void>((resolve) => (done = resolve));
    let passed = false;
    handler({ url, headers }, res, () => { passed = true; done(); });
    await finished;
    return { res, passed };
}

async function middlewareAnswersGzipGlbWithEtag() {
    const { res } = await request(`/meshes?path=${encodeURIComponent(stl)}`);
    assert.equal(res.statusCode, 200, 'mesh request is 200');
    assert.equal(res.headers['Content-Encoding'], 'gzip', 'body is gzip');
    assert.equal(res.headers['Cache-Control'], 'no-cache', 'cache is revalidated');
    assert.ok(res.headers.ETag, 'etag is set');
}

async function middlewareAnswers304OnMatchingEtag() {
    const first = await request(`/meshes?path=${encodeURIComponent(stl)}`);
    const { res } = await request(`/meshes?path=${encodeURIComponent(stl)}`, { 'if-none-match': first.res.headers.ETag });
    assert.equal(res.statusCode, 304, 'matching If-None-Match is 304');
    assert.equal(res.body, undefined, '304 has no body');
}

async function middlewareIgnoresOtherRoutesAndReportsErrors() {
    assert.equal((await request('/other')).passed, true, 'other routes fall through');
    const { res } = await request('/meshes?path=');
    assert.equal(res.statusCode, 400, 'missing path is answered 400');
}

const checks = [
    resolveMeshFileRejectsBadRequests,
    resolveMeshFileAcceptsFilesInsideTheRoot,
    concurrentRequestsConvertOnce,
    diskCacheSurvivesANewCacheInstance,
    changedMtimeReconverts,
    middlewareAnswersGzipGlbWithEtag,
    middlewareAnswers304OnMatchingEtag,
    middlewareIgnoresOtherRoutesAndReportsErrors,
];

try {
    for (const check of checks) await check();
    console.log(`mesh route: ${checks.length} checks passed`);
} finally {
    await fs.rm(tmp, { recursive: true, force: true });
}
