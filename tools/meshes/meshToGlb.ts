/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MESH_QUALITIES, MESH_SIMPLIFY_ERROR, type MeshQuality } from '../../src/Constants/meshQuality.ts';
import { keepOnlyDrawnAttributes } from './drawnAttributes.ts';
import { meshObject } from './meshObject.ts';
import { provideDomForLoaders } from './nodeDom.ts';
import { packGlb } from './packGlb.ts';

function keepThreeMaterials(object: THREE.Object3D): void {
    const rootMesh = object instanceof THREE.Mesh;
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const material of [child.material].flat() as THREE.Material[]) {
            const three = Object.fromEntries(Object.entries(material.toJSON()).filter(([key]) => key !== 'uuid'));
            material.userData = { three, rootMesh };
        }
    });
}

function placeLikeUrdfLoader(object: THREE.Object3D): void {
    object.position.set(0, 0, 0);
    object.quaternion.identity();
}

export async function meshToGlbs(file: string): Promise<Map<MeshQuality, Uint8Array>> {
    await provideDomForLoaders();
    const object = await meshObject(file);
    keepOnlyDrawnAttributes(object);
    keepThreeMaterials(object);
    placeLikeUrdfLoader(object);
    const glb = new Uint8Array(await new GLTFExporter().parseAsync(object, { binary: true }) as ArrayBuffer);
    const glbs = new Map<MeshQuality, Uint8Array>();
    for (const quality of MESH_QUALITIES) glbs.set(quality, await packGlb(glb, MESH_SIMPLIFY_ERROR[quality]));
    return glbs;
}
