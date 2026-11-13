import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseGhostStyle } from '../src/hooks/useGhostStyle.ts';

test('a stored ghost style is kept, anything else falls back to the outline', () => {
    assert.equal(parseGhostStyle('plain'), 'plain');
    assert.equal(parseGhostStyle('outline'), 'outline');
    assert.equal(parseGhostStyle(null), 'outline');
    assert.equal(parseGhostStyle('edges'), 'outline');
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
    assert.doesNotThrow(() => setGhostStyle('plain'));
});
