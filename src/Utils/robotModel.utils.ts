/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFLink, URDFVisual, URDFJoint } from 'urdf-loader';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';

export function isURDFLink(obj: THREE.Object3D): obj is URDFLink {
    return 'isURDFLink' in obj && Boolean((obj as { isURDFLink?: boolean }).isURDFLink);
}

export function isURDFVisual(obj: THREE.Object3D): obj is URDFVisual {
    return 'isURDFVisual' in obj && Boolean((obj as { isURDFVisual?: boolean }).isURDFVisual);
}

export function isURDFJoint(obj: THREE.Object3D): obj is URDFJoint {
    return 'isURDFJoint' in obj && Boolean((obj as { isURDFJoint?: boolean }).isURDFJoint);
}

export function isActuatorJoint(
    joint: URDFJoint | null,
    actuatedJointNames?: Set<string> | string[] | null,
): boolean {
    if (!joint) return false;
    if (joint.jointType === 'fixed') {
        return false;
    }
    if ('mimicJoint' in joint && Boolean((joint as { mimicJoint?: string }).mimicJoint)) {
        return false;
    }

    const name = joint.urdfName || joint.name;

    if (actuatedJointNames) {
        const count = Array.isArray(actuatedJointNames) ? actuatedJointNames.length : actuatedJointNames.size;
        if (count > 0) {
            return Array.isArray(actuatedJointNames)
                ? actuatedJointNames.includes(name)
                : actuatedJointNames.has(name);
        }
    }

    try {
        const handler = JointStateHandler.getInstance();
        const handlerJoints = handler.getJoints();
        if (handlerJoints && handlerJoints.length > 0) {
            return handlerJoints.some(j => j.name === name);
        }
        if (handler.getJointMeta(name)) {
            return true;
        }
    } catch {
        // ignore
    }

    return joint.jointType === 'revolute' || joint.jointType === 'continuous' || joint.jointType === 'prismatic';
}

export function getDirectJointForLink(
    link: URDFLink,
    robot?: THREE.Object3D | null,
    actuatedJointNames?: Set<string> | string[] | null,
): URDFJoint | null {
    let curr: THREE.Object3D | null = link.parent;
    while (curr && curr !== robot) {
        if (isURDFJoint(curr)) {
            if (isActuatorJoint(curr, actuatedJointNames)) {
                return curr;
            }
            break;
        }
        if (isURDFLink(curr)) {
            break;
        }
        curr = curr.parent;
    }

    for (const child of link.children) {
        if (isURDFJoint(child) && isActuatorJoint(child, actuatedJointNames)) {
            return child;
        }
    }

    if (robot && 'joints' in robot && robot.joints && typeof robot.joints === 'object') {
        const jointMap = robot.joints as Record<string, URDFJoint>;
        for (const j of Object.values(jointMap)) {
            if (isActuatorJoint(j, actuatedJointNames)) {
                const childLink = j.children.find(isURDFLink);
                if (childLink && (childLink === link || childLink.urdfName === link.urdfName || childLink.name === link.name)) {
                    return j;
                }
            }
        }
        for (const j of Object.values(jointMap)) {
            if (isActuatorJoint(j, actuatedJointNames)) {
                if (j.parent === link || (j.parent && (j.parent.name === link.name || (j.parent as URDFLink).urdfName === link.urdfName))) {
                    return j;
                }
            }
        }
    }

    return null;
}

export function findLinkWithJoint(
    link: URDFLink,
    robot: THREE.Object3D,
    actuatedJointNames?: Set<string> | string[] | null,
): URDFLink {
    let curr: URDFLink | null = link;
    while (curr && curr !== robot) {
        const directJoint = getDirectJointForLink(curr, robot, actuatedJointNames);
        if (directJoint) {
            return curr;
        }
        curr = findParentLink(curr.parent, robot);
    }
    return link;
}

export function findJointForLink(
    link: URDFLink,
    robot?: THREE.Object3D | null,
    actuatedJointNames?: Set<string> | string[] | null,
): URDFJoint | null {
    return getDirectJointForLink(link, robot, actuatedJointNames);
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
