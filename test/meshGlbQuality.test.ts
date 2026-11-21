/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { after, before, test } from 'node:test';
import * as THREE from 'three';
import { binaryStl, boxTriangles, gridTriangles, tempDir, writeFixtures } from './meshFixtures.ts';

const { meshToGlbs } = await import('../tools/meshes/meshToGlb.ts');
const { provideDomForLoaders } = await import('../tools/meshes/nodeDom.ts');
const { parseMeshGlb } = await import('../src/Services/meshes/parseMeshGlb.ts');

async function triangleCounts(file: string) {
    const counts: Record<string, number> = {};
    for (const [quality, glb] of await meshToGlbs(file)) {
        const scene = await parseMeshGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer);
        counts[quality] = 0;
        scene.traverse((c) => {
            if (c instanceof THREE.Mesh) counts[quality] += (c.geometry.index ?? c.geometry.getAttribute('position')).count / 3;
        });
    }
    return counts;
}

let dir: string;
before(async () => { await provideDomForLoaders(); dir = await tempDir(); });
after(() => fs.rm(dir, { recursive: true, force: true }));

test('lower qualities never have more triangles than full', async () => {
    const files = await writeFixtures(dir, boxTriangles());
    for (const file of Object.values(files)) {
        const counts = await triangleCounts(file);
        assert.equal(counts.full, 12);
        assert.ok(counts.balanced <= counts.full && counts.light <= counts.full, JSON.stringify(counts));
    }
});

test('a densely tessellated flat plate gets fewer triangles when simplified', async () => {
    const file = `${dir}/plate.stl`;
    await fs.writeFile(file, binaryStl(gridTriangles(30)));
    const counts = await triangleCounts(file);
    assert.equal(counts.full, 1800);
    assert.ok(counts.balanced < counts.full, JSON.stringify(counts));
    assert.ok(counts.light < counts.full, JSON.stringify(counts));
});
