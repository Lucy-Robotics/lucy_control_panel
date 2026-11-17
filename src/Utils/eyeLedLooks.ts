/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { eyeLedGlowMaterial } from './eyeLedGlow';

export type LedFeature = 'hotCore' | 'halo' | 'spill' | 'fade' | 'saturate';
const PAIR_FEATURES: readonly (LedFeature | null)[] = [null, 'hotCore', 'halo', 'spill', 'fade', 'saturate'];
const WHOLE_EYE: readonly LedFeature[] = ['hotCore', 'halo', 'fade', 'saturate'];

export function featuresOfLed(eye: 'left' | 'right', index: number): ReadonlySet<LedFeature> {
    if (eye === 'right') return new Set(WHOLE_EYE);
    const feature = PAIR_FEATURES[Math.floor(index / 2) % PAIR_FEATURES.length];
    return new Set(feature ? [feature] : []);
}

const FADE_MS = 150;
const SPILL_CANDELA = 1e-5;
const SPILL_REACH_M = 0.03;
const SPILL_OFFSET_M = 0.004;
const WHITE = new THREE.Color(1, 1, 1);

export function saturated(rgb: number): THREE.Color {
    const color = new THREE.Color(rgb);
    return color.lerp(WHITE, 0.35 * Math.max(color.r, color.g, color.b));
}

let falloff: THREE.DataTexture | null = null;

function radialFalloff(): THREE.DataTexture {
    const size = 32;
    const pixels = new Uint8Array(size * size * 4);
    const center = (size - 1) / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const alpha = Math.max(0, 1 - Math.hypot(x - center, y - center) / center) ** 2;
            pixels.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
        }
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.needsUpdate = true;
    return texture;
}

function overlay(led: THREE.Mesh, scale: number, opacity: number): THREE.Mesh {
    falloff ??= radialFalloff();
    const material = new THREE.MeshBasicMaterial({
        map: falloff, transparent: true, opacity, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(led.geometry, material);
    mesh.scale.set(scale, 1, scale);
    mesh.renderOrder = 1;
    mesh.raycast = () => {};
    mesh.userData.eyeLed = true;
    mesh.userData.eyeLedOverlay = true;
    led.add(mesh);
    return mesh;
}

export interface LedView {
    show: (rgb: number | null) => void;
    dispose: () => void;
}

export const isEyeLedOverlay = (mesh: THREE.Object3D): boolean => mesh.userData.eyeLedOverlay === true;

export function createEyeSpill(eye: THREE.Object3D): { update: (lit: readonly number[]) => void; dispose: () => void } {
    const light = new THREE.PointLight(0xffffff, SPILL_CANDELA * 4, SPILL_REACH_M * 2, 2);
    light.position.set(SPILL_OFFSET_M, 0, 0);
    light.intensity = 0;
    eye.add(light);
    const update = (lit: readonly number[]) => {
        light.intensity = lit.length > 0 ? SPILL_CANDELA * 4 : 0;
        if (lit.length === 0) return;
        const sum = lit.reduce((acc, rgb) => acc.add(new THREE.Color(rgb)), new THREE.Color(0, 0, 0));
        light.color.copy(sum.multiplyScalar(1 / lit.length));
    };
    return { update, dispose: () => { light.removeFromParent(); light.dispose(); } };
}

export function createLedView(led: THREE.Mesh, link: THREE.Object3D, features: ReadonlySet<LedFeature>): LedView {
    const material = eyeLedGlowMaterial();
    led.material = material;
    led.userData.eyeLed = true;
    led.visible = false;
    const core = features.has('hotCore') ? overlay(led, 0.55, 0.9) : null;
    const halo = features.has('halo') ? overlay(led, 2.6, 0.45) : null;
    if (core) (core.material as THREE.MeshBasicMaterial).color.set(WHITE);
    const spill = features.has('spill') ? new THREE.PointLight(0xffffff, SPILL_CANDELA, SPILL_REACH_M, 2) : null;
    if (spill) {
        spill.position.set(SPILL_OFFSET_M, 0, 0);
        spill.intensity = 0;
        link.add(spill);
    }
    let frame = 0;

    const paint = (rgb: number) => {
        const color = features.has('saturate') ? saturated(rgb) : new THREE.Color(rgb);
        material.color.copy(color);
        if (halo) (halo.material as THREE.MeshBasicMaterial).color.copy(color);
        if (spill) spill.color.copy(color);
    };
    const setLit = (lit: boolean) => {
        led.visible = lit;
        if (spill) spill.intensity = lit ? SPILL_CANDELA : 0;
    };
    const fadeTo = (rgb: number | null) => {
        cancelAnimationFrame(frame);
        const from = led.visible ? material.opacity : 0;
        const to = rgb === null ? 0 : 1;
        if (rgb !== null) paint(rgb);
        material.transparent = true;
        setLit(true);
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / FADE_MS);
            material.opacity = from + (to - from) * t;
            if (t < 1) frame = requestAnimationFrame(step);
            else if (to === 0) setLit(false);
        };
        frame = requestAnimationFrame(step);
    };

    return {
        show: (rgb) => {
            if (features.has('fade')) return fadeTo(rgb);
            if (rgb !== null) paint(rgb);
            setLit(rgb !== null);
        },
        dispose: () => {
            if (frame) cancelAnimationFrame(frame);
            core?.removeFromParent();
            halo?.removeFromParent();
            spill?.removeFromParent();
            spill?.dispose();
            led.visible = false;
        },
    };
}
