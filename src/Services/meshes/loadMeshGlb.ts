/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MESH_ROUTE } from '../../Constants/meshRoute.ts';

const gltfLoader = new GLTFLoader();
const materialLoader = new THREE.MaterialLoader();

function restoreThreeMaterials(object: THREE.Object3D): void {
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || !child.material.userData.three) return;
        const exported = child.material;
        child.material = materialLoader.parse(exported.userData.three);
        exported.dispose();
    });
}

export async function fetchMeshGlb(path: string): Promise<ArrayBuffer> {
    const response = await fetch(`${MESH_ROUTE}?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`${(await response.text()) || response.statusText} (${path})`);
    return response.arrayBuffer();
}

export async function parseMeshGlb(glb: ArrayBuffer): Promise<THREE.Object3D> {
    const { scene } = await gltfLoader.parseAsync(glb, '');
    restoreThreeMaterials(scene);
    return scene;
}
