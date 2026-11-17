/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { eyeLedGlowMaterial } from './eyeLedGlow';

const HALO_SCALE = 2.6;
const HALO_OPACITY = 0.45;
const SOLID_UNTIL = 0.65;
const WHITE = new THREE.Color(1, 1, 1);

export function whitened(rgb: number): THREE.Color {
    const color = new THREE.Color(rgb);
    return color.lerp(WHITE, 0.35 * Math.max(color.r, color.g, color.b));
}

const smoothstep = (from: number, to: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
    return t * t * (3 - 2 * t);
};

export const softEdgeAlpha = (radius: number): number => 1 - smoothstep(SOLID_UNTIL, 1, radius);

const DISC_IN_HALO = 1 / HALO_SCALE;
export const haloAlpha = (radius: number): number =>
    Math.max(0, 1 - radius) ** 2 * smoothstep(DISC_IN_HALO * SOLID_UNTIL, DISC_IN_HALO, radius);

const FLAT_DISC = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);

function radialTexture(alphaAt: (radius: number) => number): THREE.DataTexture {
    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    const center = (size - 1) / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            pixels.set([255, 255, 255, Math.round(alphaAt(Math.hypot(x - center, y - center) / center) * 255)], (y * size + x) * 4);
        }
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.magFilter = texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

let textures: { edge: THREE.DataTexture; halo: THREE.DataTexture } | null = null;
const sharedTextures = () => (textures ??= { edge: radialTexture(softEdgeAlpha), halo: radialTexture(haloAlpha) });

function addHalo(led: THREE.Mesh): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
    const material = new THREE.MeshBasicMaterial({
        map: sharedTextures().halo, transparent: true, opacity: HALO_OPACITY, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    const halo = new THREE.Mesh(FLAT_DISC, material);
    halo.scale.set(HALO_SCALE, 1, HALO_SCALE);
    halo.renderOrder = 1;
    halo.raycast = () => {};
    halo.userData.eyeLed = true;
    halo.userData.eyeLedHalo = true;
    led.add(halo);
    return halo;
}

export const isEyeLedHalo = (mesh: THREE.Object3D): boolean => mesh.userData.eyeLedHalo === true;

export interface LedView {
    show: (rgb: number | null) => void;
    dispose: () => void;
}

export function createLedView(led: THREE.Mesh): LedView {
    const material = eyeLedGlowMaterial();
    material.map = sharedTextures().edge;
    material.transparent = true;
    material.depthWrite = false;
    led.geometry = FLAT_DISC;
    led.material = material;
    led.userData.eyeLed = true;
    led.visible = false;
    const halo = addHalo(led);
    return {
        show: (rgb) => {
            if (rgb !== null) {
                const color = whitened(rgb);
                material.color.copy(color);
                halo.material.color.copy(color);
            }
            led.visible = rgb !== null;
        },
        dispose: () => {
            halo.removeFromParent();
            halo.material.dispose();
            led.visible = false;
        },
    };
}
