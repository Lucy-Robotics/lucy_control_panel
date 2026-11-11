/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

export function createGhostOutline(
    scene: THREE.Scene,
    camera: THREE.Camera,
    ghost: THREE.Object3D,
    color: THREE.ColorRepresentation,
): OutlinePass {
    const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera, [ghost]);
    outline.edgeStrength = 4;
    outline.edgeThickness = 1;
    outline.edgeGlow = 0;
    outline.visibleEdgeColor.set(color);
    outline.hiddenEdgeColor.set(color);
    // Additive blending cannot darken: blend normally so a dark outline shows.
    outline.overlayMaterial.blending = THREE.NormalBlending;
    return outline;
}

// The pass draws its overlay into readBuffer; null draws it straight over the frame already on screen.
export function drawGhostOutline(gl: THREE.WebGLRenderer, outline: OutlinePass): void {
    outline.render(gl, null as unknown as THREE.WebGLRenderTarget, null as unknown as THREE.WebGLRenderTarget, 0, false);
}
