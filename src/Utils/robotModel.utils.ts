/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFLink, URDFVisual } from 'urdf-loader';

export function isURDFLink(obj: THREE.Object3D): obj is URDFLink {
    return 'isURDFLink' in obj && Boolean((obj as { isURDFLink?: boolean }).isURDFLink);
}

export function isURDFVisual(obj: THREE.Object3D): obj is URDFVisual {
    return 'isURDFVisual' in obj && Boolean((obj as { isURDFVisual?: boolean }).isURDFVisual);
}

export function findParentLink(obj: THREE.Object3D | null, robot: THREE.Object3D): URDFLink | null {
    let curr: THREE.Object3D | null = obj;
    while (curr && curr !== robot) {
        if (isURDFLink(curr)) {
            return curr;
        }
        curr = curr.parent;
    }
    if (isURDFLink(robot)) {
        return robot;
    }
    return null;
}

export function getLinkBoundingBox(link: URDFLink): THREE.Box3 {
    const box = new THREE.Box3();
    let hasVisuals = false;
    for (const child of link.children) {
        if (isURDFVisual(child)) {
            box.expandByObject(child);
            hasVisuals = true;
        }
    }
    if (!hasVisuals || box.isEmpty()) {
        const wp = link.getWorldPosition(new THREE.Vector3());
        box.min.copy(wp).subScalar(0.05);
        box.max.copy(wp).addScalar(0.05);
    }
    return box;
}
