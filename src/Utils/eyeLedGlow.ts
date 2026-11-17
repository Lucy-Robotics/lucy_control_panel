/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

const GLOW_SIZE = 32;

function radialFalloff(): THREE.DataTexture {
    const pixels = new Uint8Array(GLOW_SIZE * GLOW_SIZE * 4);
    const center = (GLOW_SIZE - 1) / 2;
    for (let y = 0; y < GLOW_SIZE; y++) {
        for (let x = 0; x < GLOW_SIZE; x++) {
            const distance = Math.hypot(x - center, y - center) / center;
            const alpha = Math.max(0, 1 - distance) ** 2;
            pixels.set([255, 255, 255, Math.round(alpha * 255)], (y * GLOW_SIZE + x) * 4);
        }
    }
    const texture = new THREE.DataTexture(pixels, GLOW_SIZE, GLOW_SIZE);
    texture.needsUpdate = true;
    return texture;
}

let falloff: THREE.DataTexture | null = null;

export function eyeLedGlowMaterial(): THREE.MeshBasicMaterial {
    falloff ??= radialFalloff();
    return new THREE.MeshBasicMaterial({
        map: falloff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
    });
}

export const isEyeLed = (mesh: THREE.Object3D): boolean => mesh.userData.eyeLed === true;
