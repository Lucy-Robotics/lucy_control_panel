/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { tempDir } from './meshFixtures.ts';

const { cachedGlbPath, isFresh, writeAtomically } = await import('../tools/meshes/meshCache.ts');

let dir: string;
before(async () => { dir = await tempDir(); });
after(() => fs.rm(dir, { recursive: true, force: true }));

test('the cache path is stable and differs per quality and per source', () => {
    const full = cachedGlbPath('/a/part.dae', 'full', dir);
    assert.equal(cachedGlbPath('/a/part.dae', 'full', dir), full);
    assert.match(path.basename(full), /^[0-9a-f]{20}\.full\.glb$/);
    assert.equal(path.dirname(full), dir);
    assert.notEqual(cachedGlbPath('/a/part.dae', 'light', dir), full);
    assert.notEqual(cachedGlbPath('/a/other.dae', 'full', dir), full);
    assert.match(cachedGlbPath('/a/part.dae', 'balanced', dir), /\.balanced\.glb$/);
});

test('a cached file is fresh only when it exists and is not older than its source', async () => {
    const source = path.join(dir, 'src.stl'), glb = path.join(dir, 'src.glb');
    await fs.writeFile(source, 'x');
    assert.equal(await isFresh(source, glb), false);
    await fs.writeFile(glb, 'x');
    const now = Date.now() / 1000;
    await fs.utimes(source, now, now);
    await fs.utimes(glb, now - 100, now - 100);
    assert.equal(await isFresh(source, glb), false);
    await fs.utimes(glb, now + 100, now + 100);
    assert.equal(await isFresh(source, glb), true);
    assert.equal(await isFresh(path.join(dir, 'missing'), glb), false);
});

test('atomic writes replace the content and leave no temp file', async () => {
    const file = path.join(dir, 'nested', 'out.glb');
    await writeAtomically(file, new Uint8Array([1, 2, 3]));
    await writeAtomically(file, new Uint8Array([9, 8]));
    assert.deepEqual([...await fs.readFile(file)], [9, 8]);
    assert.deepEqual(await fs.readdir(path.dirname(file)), ['out.glb']);
});
