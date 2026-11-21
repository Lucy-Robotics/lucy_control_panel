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

const run = promisify(execFile);
const QUALITIES = ['full', 'balanced', 'light'];

let meshes: string;
let files: Record<'dae' | 'stl' | 'obj', string>;

const cli = async () => {
    const args = ['--import', './test/ts-loader-register.mjs', '--experimental-strip-types', 'tools/meshes-to-glb.ts', meshes];
    return (await run(process.execPath, args)).stdout;
};
const glbs = async (dir: string) => (await fs.readdir(dir)).filter((n) => n.endsWith('.glb')).sort();
const contents = async (dir: string) => Promise.all((await glbs(dir)).map((n) => fs.readFile(path.join(dir, n))));

before(async () => {
    meshes = await tempDir();
    await fs.mkdir(path.join(meshes, 'archive'));
    files = await writeFixtures(meshes);
    await fs.writeFile(path.join(meshes, 'broken.obj'), 'not a mesh');
    await fs.copyFile(files.stl, path.join(meshes, 'archive', 'old.stl'));
});
after(() => fs.rm(meshes, { recursive: true, force: true }));

test('the converter writes a GLB per quality beside each mesh, reports a broken one, and skips archive', async () => {
    assert.match(await cli(), /3 converted, 1 failed/);
    const expected = Object.values(files).flatMap((file) => QUALITIES.map((q) => `${path.basename(file)}.${q}.glb`)).sort();
    assert.deepEqual(await glbs(meshes), expected);
    assert.deepEqual(await glbs(path.join(meshes, 'archive')), []);
});

test('converting again gives byte-identical GLBs so git sees no change', async () => {
    const first = await contents(meshes);
    await cli();
    assert.deepEqual(await contents(meshes), first);
});
