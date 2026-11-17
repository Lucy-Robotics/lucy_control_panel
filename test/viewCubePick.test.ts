import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildHoverPatches } from '../src/Utils/viewCubeHoverPatches.ts';
import { pickCubePiece } from '../src/Utils/viewCubePick.ts';

const CHAMFER = 0.4;
const patches = buildHoverPatches(CHAMFER);
const cube = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

function seeded(seed: number) {
    return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function patchCovers(key: string, point: THREE.Vector3): boolean {
    const face = [0, 1, 2].find(axis => Math.abs(Math.abs(point.getComponent(axis)) - 1) < 1e-9)!;
    const flat = (p: THREE.Vector3) => new THREE.Vector3(...[0, 1, 2].map(a => (a === face ? 0 : p.getComponent(a))));
    const position = patches.get(key)!.getAttribute('position');
    for (let t = 0; t < position.count; t += 3) {
        const corners = [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(position, t + i));
        const onFace = corners.every(c => Math.sign(c.getComponent(face)) === Math.sign(point.getComponent(face)) && Math.abs(c.getComponent(face)) > 1);
        if (onFace && new THREE.Triangle(...corners.map(flat)).containsPoint(flat(point))) return true;
    }
    return false;
}

test('the lit patch covers the point under the pointer, from any view and anywhere on the cube', () => {
    const random = seeded(7);
    let checked = 0;
    for (let view = 0; view < 200; view++) {
        const toCube = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 7, random() * 7, random() * 7)).invert();
        const toward = new THREE.Vector3(0, 0, -1).applyQuaternion(toCube);
        for (let sample = 0; sample < 50; sample++) {
            const screen = new THREE.Vector3((random() * 2 - 1) * 1.8, (random() * 2 - 1) * 1.8, 10).applyQuaternion(toCube);
            const hit = new THREE.Ray(screen, toward).intersectBox(cube, new THREE.Vector3());
            if (!hit) continue;
            const { key } = pickCubePiece(hit, CHAMFER);
            assert.ok(patchCovers(key, hit), `view ${view} sample ${sample}: ${key} does not cover ${hit.toArray().map(c => c.toFixed(3))}`);
            checked++;
        }
    }
    assert.ok(checked > 3000);
});

test('a face, an edge and a corner turn the camera toward their own direction', () => {
    const face = pickCubePiece(new THREE.Vector3(1, 0.2, -0.3), CHAMFER);
    assert.equal(face.key, 'face-01');
    assert.deepEqual(face.direction.toArray(), [1, 0, 0]);

    const edge = pickCubePiece(new THREE.Vector3(0.9, 1, 0), CHAMFER);
    assert.equal(edge.key, 'edge-01-11');
    assert.ok(edge.direction.equals(new THREE.Vector3(1, 1, 0).normalize()));

    const corner = pickCubePiece(new THREE.Vector3(-0.8, 1, -0.95), CHAMFER);
    assert.equal(corner.key, 'corner--11-1');
    assert.ok(corner.direction.equals(new THREE.Vector3(-1, 1, -1).normalize()));
});
