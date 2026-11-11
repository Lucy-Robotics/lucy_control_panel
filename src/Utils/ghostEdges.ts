/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

const CREASE_ANGLE_DEG = 30;
const noRaycast = () => {};

export function attachGhostEdges(ghost: THREE.Object3D, color: THREE.ColorRepresentation): () => void {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false });
    const meshes: THREE.Mesh[] = [];
    ghost.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
    });
    const lines = meshes.map((mesh) => {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, CREASE_ANGLE_DEG), material);
        edges.renderOrder = mesh.renderOrder + 1;
        edges.raycast = noRaycast;
        mesh.add(edges);
        return edges;
    });
    return () => {
        lines.forEach((edges) => {
            edges.removeFromParent();
            edges.geometry.dispose();
        });
        material.dispose();
    };
}
