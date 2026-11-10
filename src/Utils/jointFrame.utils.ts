/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFJoint } from 'urdf-loader';
import { getJointAngle, getLinkBoundingBox, isURDFLink } from './robotModel.utils';

export function jointRingRadius(joint: URDFJoint): number {
    let maxDim = 0.2;
    for (const child of joint.children) {
        if (isURDFLink(child)) {
            const box = getLinkBoundingBox(child);
            const size = box.getSize(new THREE.Vector3());
            const d = Math.max(size.x, size.y, size.z);
            if (d > 0.02) maxDim = Math.max(maxDim, d);
        }
    }
    return THREE.MathUtils.clamp(maxDim * 0.42, 0.11, 0.32);
}

export function jointZeroBasis(joint: URDFJoint): THREE.Quaternion {
    const axis = joint.axis.clone().normalize();

    let ref: THREE.Vector3 | null = null;
    for (const child of joint.children) {
        if (!isURDFLink(child)) continue;
        joint.updateWorldMatrix(true, true);
        const worldCenter = getLinkBoundingBox(child).getCenter(new THREE.Vector3());
        const local = joint.worldToLocal(worldCenter);
        local.addScaledVector(axis, -local.dot(axis));
        if (local.lengthSq() > 1e-8) {
            ref = local.applyAxisAngle(axis, getJointAngle(joint)).normalize();
        }
        break;
    }
    if (!ref) {
        const seed = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        ref = seed.addScaledVector(axis, -seed.dot(axis)).normalize();
    }
    const v = new THREE.Vector3().crossVectors(axis, ref).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ref, v, axis));
}

export function placeAtJoint(target: THREE.Object3D, joint: URDFJoint, zeroBasis: THREE.Quaternion): void {
    if (!joint.parent) return;
    joint.updateWorldMatrix(true, false);
    joint.getWorldPosition(target.position);
    const origQuaternion = (joint as URDFJoint & { origQuaternion?: THREE.Quaternion | null }).origQuaternion;
    joint.parent.getWorldQuaternion(target.quaternion)
        .multiply(origQuaternion ?? joint.quaternion)
        .multiply(zeroBasis);
}
