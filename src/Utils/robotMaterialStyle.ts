/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

const SELECTED_EMISSIVE_INTENSITY = 0.25;
const OVERHEATED_EMISSIVE_INTENSITY = 0.6;
const NO_EMISSIVE = new THREE.Color(0x000000);
const UNSELECTED_COLOR = new THREE.Color(0xffffff);
const OVERHEATED_COLOR = new THREE.Color(0xff2020);

export type PartStyle = 'normal' | 'selected' | 'unselected' | 'overheated';

function hasEmissive(m: THREE.Material): m is THREE.MeshStandardMaterial | THREE.MeshPhongMaterial {
    return m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhongMaterial;
}

function hasColor(m: THREE.Material): m is THREE.Material & { color: THREE.Color } {
    return (m as { color?: unknown }).color instanceof THREE.Color;
}

function colorFor(style: PartStyle, original: THREE.Color, focus: THREE.Color): THREE.Color {
    switch (style) {
        case 'selected': return focus;
        case 'unselected': return UNSELECTED_COLOR;
        case 'overheated': return OVERHEATED_COLOR;
        default: return original;
    }
}

export function applyStyle(
    display: THREE.Material,
    orig: THREE.Material,
    style: PartStyle,
    wireframe: boolean,
    focus: THREE.Color,
    unselectedOpacity: number,
) {
    if ('wireframe' in display) {
        (display as THREE.MeshStandardMaterial).wireframe = wireframe;
    }

    if (hasColor(display) && hasColor(orig)) {
        display.color.copy(colorFor(style, orig.color, focus));
    }

    if (hasEmissive(display) && hasEmissive(orig)) {
        if (style === 'selected') {
            display.emissive.copy(focus);
            display.emissiveIntensity = SELECTED_EMISSIVE_INTENSITY;
        } else if (style === 'overheated') {
            display.emissive.copy(OVERHEATED_COLOR);
            display.emissiveIntensity = OVERHEATED_EMISSIVE_INTENSITY;
        } else if (style === 'unselected') {
            display.emissive.copy(NO_EMISSIVE);
            display.emissiveIntensity = 0;
        } else {
            display.emissive.copy(orig.emissive);
            display.emissiveIntensity = orig.emissiveIntensity;
        }
    }

    const opacity = style === 'unselected' ? unselectedOpacity : orig.opacity;
    const transparent = style === 'unselected' ? unselectedOpacity < 1 : orig.transparent;
    if (display.transparent !== transparent) {
        display.transparent = transparent;
        display.needsUpdate = true;
    }
    display.opacity = opacity;
}
