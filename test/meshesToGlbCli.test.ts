/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';
import { tempDir, writeFixtures } from './meshFixtures.ts';

const { cachedGlbPath } = await import('../tools/meshes/meshCache.ts');
const run = promisify(execFile);

let home: string;
let meshes: string;
let files: Record<'dae' | 'stl' | 'obj', string>;

const cli = async () => {
    const args = ['--import', './test/ts-loader-register.mjs', '--experimental-strip-types', 'tools/meshes-to-glb.ts', meshes];
    return (await run(process.execPath, args, { env: { ...process.env, HOME: home } })).stdout;
};
const cacheDir = () => path.join(home, '.cache', 'lucy', 'meshes');
const cacheFiles = async () => (await fs.readdir(cacheDir()).catch(() => [])).filter((n) => n.endsWith('.glb')).sort();

before(async () => {
    home = await tempDir();
    meshes = path.join(home, 'meshes');
    await fs.mkdir(path.join(meshes, 'archive'), { recursive: true });
    files = await writeFixtures(meshes);
    await fs.writeFile(path.join(meshes, 'broken.obj'), 'not a mesh');
    await fs.copyFile(files.stl, path.join(meshes, 'archive', 'old.stl'));
});
after(() => fs.rm(home, { recursive: true, force: true }));

test('the converter writes three GLBs per mesh, reports a broken one, and skips archive', async () => {
    const out = await cli();
    assert.match(out, /3 converted, 0 already up to date, 1 failed/);
    const names = await cacheFiles();
    assert.equal(names.length, 9);
    for (const file of Object.values(files)) {
        for (const q of ['full', 'balanced', 'light'] as const) {
            assert.ok(names.includes(path.basename(cachedGlbPath(await fs.realpath(file), q))));
        }
    }
    const archived = path.basename(cachedGlbPath(await fs.realpath(path.join(meshes, 'archive', 'old.stl')), 'full'));
    assert.ok(!names.includes(archived));
});

test('a second run leaves up-to-date GLBs untouched', async () => {
    const before = await Promise.all((await cacheFiles()).map(async (n) => (await fs.stat(path.join(cacheDir(), n))).mtimeMs));
    const out = await cli();
    assert.match(out, /0 converted, 3 already up to date, 1 failed/);
    const after = await Promise.all((await cacheFiles()).map(async (n) => (await fs.stat(path.join(cacheDir(), n))).mtimeMs));
    assert.deepEqual(after, before);
});
