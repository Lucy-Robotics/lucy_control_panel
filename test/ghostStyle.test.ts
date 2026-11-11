import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseGhostStyle } from '../src/hooks/useGhostStyle.ts';
import { attachGhostEdges } from '../src/Utils/ghostEdges.ts';

test('a stored ghost style is kept, anything else falls back to the plain ghost', () => {
    assert.equal(parseGhostStyle('edges'), 'edges');
    assert.equal(parseGhostStyle('outline'), 'outline');
    assert.equal(parseGhostStyle(null), 'plain');
    assert.equal(parseGhostStyle('neon'), 'plain');
});

const ghostWithTwoParts = () => {
    const ghost = new THREE.Group();
    const part = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const link = new THREE.Group();
    link.add(part());
    ghost.add(part(), link);
    return ghost;
};
const edgeLines = (root: THREE.Object3D) => {
    const lines: THREE.LineSegments[] = [];
    root.traverse((obj) => { if ((obj as THREE.LineSegments).isLineSegments) lines.push(obj as THREE.LineSegments); });
    return lines;
};

test('edges outline every ghost part in the casing colour, only along creases', () => {
    const ghost = ghostWithTwoParts();
    attachGhostEdges(ghost, '#000000');
    const lines = edgeLines(ghost);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => (line.material as THREE.LineBasicMaterial).color.getHex() === 0x000000));
    assert.equal(lines[0].geometry.getAttribute('position').count, 12 * 2, 'a box shows its 12 edges, not its face diagonals');
    assert.equal(lines[0].geometry.type, 'EdgesGeometry');
});

test('detaching the edges removes them and frees their geometry', () => {
    const ghost = ghostWithTwoParts();
    const detach = attachGhostEdges(ghost, '#000000');
    const [line] = edgeLines(ghost);
    let freed = false;
    line.geometry.addEventListener('dispose', () => { freed = true; });
    detach();
    assert.equal(edgeLines(ghost).length, 0);
    assert.ok(freed);
});

test('the outline darkens the ghost silhouette in the casing colour, seen or hidden', async () => {
    const { createGhostOutline } = await import('../src/Utils/ghostOutline.ts');
    const ghost = new THREE.Group();
    const outline = createGhostOutline(new THREE.Scene(), new THREE.PerspectiveCamera(), ghost, '#000000');
    assert.deepEqual(outline.selectedObjects, [ghost]);
    assert.equal(outline.visibleEdgeColor.getHex(), 0x000000);
    assert.equal(outline.hiddenEdgeColor.getHex(), 0x000000);
    assert.equal(outline.overlayMaterial.blending, THREE.NormalBlending, 'additive blending would make a dark outline invisible');
    outline.dispose();
});

test('edges are only added to meshes and leave the ghost meshes\' own geometry alone', () => {
    const ghost = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const before = mesh.geometry.getAttribute('position').count;
    ghost.add(mesh, new THREE.Group(), new THREE.Object3D());
    attachGhostEdges(ghost, '#000000');
    assert.equal(edgeLines(ghost).length, 1);
    assert.equal(edgeLines(ghost)[0].parent, mesh);
    assert.equal(mesh.geometry.getAttribute('position').count, before);
    assert.equal(mesh.children.length, 1);
});

test('the chosen ghost style is saved so it survives a reload', async () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    });
    const { setGhostStyle } = await import('../src/hooks/useGhostStyle.ts');
    setGhostStyle('outline');
    assert.equal(store.get('ghostStyle'), 'outline');
    setGhostStyle('plain');
    assert.equal(store.get('ghostStyle'), 'plain');
});

test('choosing a ghost style still works when storage is unavailable', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => null, setItem: () => { throw new Error('denied'); } },
    });
    const { setGhostStyle } = await import('../src/hooks/useGhostStyle.ts');
    assert.doesNotThrow(() => setGhostStyle('edges'));
});
