/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import type { Connect, Plugin } from 'vite';
import { MESH_ROUTE } from '../src/Constants/meshRoute.ts';
import { meshToGlb } from './meshToGlb.ts';

const MESH_EXTENSIONS = new Set(['.dae', '.stl', '.obj']);
const CONVERTER_VERSION = '1';

class MeshRequestError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function resolveMeshFile(ref: string | null, roots: string[]): Promise<string> {
    if (!ref) throw new MeshRequestError(400, 'missing path');
    const requested = ref.startsWith('file://') ? fileURLToPath(ref) : ref;
    if (!MESH_EXTENSIONS.has(path.extname(requested).toLowerCase())) throw new MeshRequestError(403, `not a mesh: ${ref}`);
    const file = await fs.realpath(requested).catch(() => {
        throw new MeshRequestError(404, `mesh not found: ${ref}`);
    });
    const allowed = await Promise.all(roots.map((root) => fs.realpath(root).catch(() => null)));
    if (!allowed.some((root) => root && file.startsWith(root + path.sep))) {
        throw new MeshRequestError(403, `mesh outside the workspace: ${ref}`);
    }
    return file;
}

export function createMeshCache(cacheDir: string, convert: (file: string) => Promise<ArrayBuffer> = meshToGlb) {
    const inFlight = new Map<string, Promise<Buffer>>();

    async function build(file: string, cached: string): Promise<Buffer> {
        const glb = await promisify(gzip)(Buffer.from(await convert(file)));
        await fs.mkdir(cacheDir, { recursive: true });
        const partial = `${cached}.${process.pid}.${randomUUID()}.tmp`;
        await fs.writeFile(partial, glb);
        await fs.rename(partial, cached);
        return glb;
    }

    return async (file: string): Promise<{ etag: string; body: Buffer }> => {
        const { size, mtimeMs } = await fs.stat(file);
        const etag = createHash('sha1').update(`${CONVERTER_VERSION}\0${file}\0${size}\0${mtimeMs}`).digest('hex');
        const cached = path.join(cacheDir, `${etag}.glb.gz`);
        let body = inFlight.get(etag);
        if (!body) {
            body = fs.readFile(cached).catch(() => build(file, cached)).finally(() => inFlight.delete(etag));
            inFlight.set(etag, body);
        }
        return { etag: `"${etag}"`, body: await body };
    };
}

export function meshRoute(roots: string[], cacheDir: string): Plugin {
    const glbOf = createMeshCache(cacheDir);
    const handle: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== MESH_ROUTE) return next();
        resolveMeshFile(url.searchParams.get('path'), roots)
            .then(glbOf)
            .then(({ etag, body }) => {
                res.setHeader('ETag', etag);
                res.setHeader('Cache-Control', 'no-cache');
                if (req.headers['if-none-match'] === etag) {
                    res.statusCode = 304;
                    res.end();
                    return;
                }
                res.setHeader('Content-Type', 'model/gltf-binary');
                res.setHeader('Content-Encoding', 'gzip');
                res.end(body);
            })
            .catch((e: unknown) => {
                res.statusCode = e instanceof MeshRequestError ? e.status : 500;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end(e instanceof Error ? e.message : String(e));
            });
    };
    return {
        name: 'lucy-mesh-glb',
        configureServer: (server) => { server.middlewares.use(handle); },
        configurePreviewServer: (server) => { server.middlewares.use(handle); },
    };
}
