/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const materialLoader = new THREE.MaterialLoader();

function bakeTransform(mesh: THREE.Mesh): void {
    const position = mesh.geometry.getAttribute('position');
    const floats = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) floats.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
    mesh.geometry.setAttribute('position', new THREE.BufferAttribute(floats, 3));
    mesh.updateWorldMatrix(true, false);
    mesh.geometry.applyMatrix4(mesh.matrixWorld);
    mesh.removeFromParent();
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
}

function restoreFlatNormals(mesh: THREE.Mesh): void {
    if (mesh.geometry.getAttribute('normal')) return;
    const flat = mesh.geometry.toNonIndexed();
    flat.computeVertexNormals();
    mesh.geometry.dispose();
    mesh.geometry = flat;
}

function restoreThreeMaterial(mesh: THREE.Mesh): void {
    if (Array.isArray(mesh.material) || !mesh.material.userData.three) return;
    const exported = mesh.material;
    mesh.material = materialLoader.parse(exported.userData.three);
    exported.dispose();
}

export async function parseMeshGlb(glb: ArrayBuffer): Promise<THREE.Object3D> {
    const { scene } = await gltfLoader.parseAsync(glb, '');
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
    });
    const rootMesh = meshes.length === 1 && !Array.isArray(meshes[0].material) && meshes[0].material.userData.rootMesh === true;
    for (const mesh of meshes) {
        if (rootMesh) bakeTransform(mesh);
        restoreFlatNormals(mesh);
        restoreThreeMaterial(mesh);
    }
    return rootMesh ? meshes[0] : scene;
}
