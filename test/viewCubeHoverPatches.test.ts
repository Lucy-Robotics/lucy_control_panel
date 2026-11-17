import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHoverPatches } from '../src/Utils/viewCubeHoverPatches.ts';

const CHAMFER = 0.4;
const INNER = 1 - CHAMFER;
const patches = buildHoverPatches(CHAMFER);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;

type V = [number, number, number];
type Tri = { v: V[]; normal: V; area: number; face: string };

function triangles(key: string): Tri[] {
    const pos = patches.get(key)!.getAttribute('position');
    const out: Tri[] = [];
    for (let t = 0; t < pos.count; t += 3) {
        const v = [0, 1, 2].map(i => [pos.getX(t + i), pos.getY(t + i), pos.getZ(t + i)] as V);
        const e1 = v[1].map((c, i) => c - v[0][i]);
        const e2 = v[2].map((c, i) => c - v[0][i]);
        const n: V = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const axis = [0, 1, 2].find(a => v.every(p => near(Math.abs(p[a]), 1.002)))!;
        assert.notEqual(axis, undefined, `${key}: triangle not on a cube face`);
        out.push({ v, normal: n, area: Math.hypot(...n) / 2, face: `${axis}${Math.sign(v[0][axis])}` });
    }
    return out;
}

/** Area covered per face ("axis sign"), e.g. { '01': 2.4 }. */
function areaByFace(key: string): Record<string, number> {
    const res: Record<string, number> = {};
    for (const t of triangles(key)) res[t.face] = (res[t.face] ?? 0) + t.area;
    return res;
}

function assertAreas(key: string, expected: Record<string, number>) {
    const got = areaByFace(key);
    assert.deepEqual(Object.keys(got).sort(), Object.keys(expected).sort(), `${key} faces`);
    for (const f of Object.keys(expected)) assert.ok(near(got[f], expected[f]), `${key} face ${f}: ${got[f]} vs ${expected[f]}`);
}

test('every face, edge and corner zone has a patch under the ViewCube hit-piece key', () => {
    const expected: string[] = [];
    for (const a of [0, 1, 2]) for (const s of [1, -1]) expected.push(`face-${a}${s}`);
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const si of [1, -1]) for (const sj of [1, -1]) expected.push(`edge-${i}${si}-${j}${sj}`);
    for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) expected.push(`corner-${x}${y}${z}`);
    assert.equal(expected.length, 26);
    assert.deepEqual([...patches.keys()].sort(), expected.sort());
});

test('a face patch covers only the centre square of its own face', () => {
    for (const a of [0, 1, 2]) for (const s of [1, -1]) {
        assertAreas(`face-${a}${s}`, { [`${a}${s}`]: 4 * INNER * INNER });
    }
});

test('an edge patch covers a strip on each of the two faces along that edge', () => {
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const si of [1, -1]) for (const sj of [1, -1]) {
        assertAreas(`edge-${i}${si}-${j}${sj}`, { [`${i}${si}`]: 2 * INNER * CHAMFER, [`${j}${sj}`]: 2 * INNER * CHAMFER });
    }
});

test('a corner patch covers a small square on each of the three faces at that corner', () => {
    for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) {
        assertAreas(`corner-${x}${y}${z}`, { [`0${x}`]: CHAMFER ** 2, [`1${y}`]: CHAMFER ** 2, [`2${z}`]: CHAMFER ** 2 });
    }
});

test('every patch triangle faces away from the cube centre and no vertex is inside the cube', () => {
    for (const key of patches.keys()) for (const t of triangles(key)) {
        const centroid = [0, 1, 2].map(i => (t.v[0][i] + t.v[1][i] + t.v[2][i]) / 3);
        const dot = t.normal.reduce((s, c, i) => s + c * centroid[i], 0);
        assert.ok(dot > 0, `${key}: triangle faces inward`);
        for (const p of t.v) assert.ok(Math.max(...p.map(Math.abs)) >= 1.002 - 1e-5, `${key}: vertex inside cube`);
    }
});
