/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

const MAX_HEAT_SOURCES = 32;
const HEAT_RADIUS_M = 0.09;

const VERTEX_DECLARATIONS = 'varying vec3 vHeatWorldPosition;';
const VERTEX_WORLD_POSITION = 'vHeatWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;';
const FRAGMENT_DECLARATIONS = `
varying vec3 vHeatWorldPosition;
uniform vec4 heatSources[${MAX_HEAT_SOURCES}];

float heatAtFragment() {
    float heat = 0.0;
    for (int i = 0; i < ${MAX_HEAT_SOURCES}; i++) {
        float falloff = distance(vHeatWorldPosition, heatSources[i].xyz) / ${HEAT_RADIUS_M.toFixed(3)};
        heat = max(heat, heatSources[i].w * exp(-falloff * falloff));
    }
    return heat;
}

vec3 heatRamp(float heat) {
    vec3 color = mix(vec3(1.0), vec3(1.0, 0.9, 0.1), smoothstep(0.0, 0.35, heat));
    color = mix(color, vec3(1.0, 0.45, 0.0), smoothstep(0.35, 0.65, heat));
    return mix(color, vec3(0.9, 0.0, 0.0), smoothstep(0.65, 1.0, heat));
}
`;

export interface EffortHeatMap {
    material: THREE.MeshStandardMaterial;
    sources: THREE.Vector4[];
}

export function createEffortHeatMap(): EffortHeatMap {
    const sources = Array.from({ length: MAX_HEAT_SOURCES }, () => new THREE.Vector4());
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
    material.onBeforeCompile = (shader) => {
        shader.uniforms.heatSources = { value: sources };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${VERTEX_DECLARATIONS}`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_WORLD_POSITION}`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\n${FRAGMENT_DECLARATIONS}`)
            .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = heatRamp(heatAtFragment());');
    };
    return { material, sources };
}
