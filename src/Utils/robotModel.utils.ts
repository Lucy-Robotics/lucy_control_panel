/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFLink, URDFVisual, URDFJoint } from 'urdf-loader';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import type { JointControlState } from '../Constants/robotTypes';

export function isURDFLink(obj: THREE.Object3D): obj is URDFLink {
    return 'isURDFLink' in obj && Boolean((obj as { isURDFLink?: boolean }).isURDFLink);
}

export function isURDFVisual(obj: THREE.Object3D): obj is URDFVisual {
    return 'isURDFVisual' in obj && Boolean((obj as { isURDFVisual?: boolean }).isURDFVisual);
}

export function isURDFJoint(obj: THREE.Object3D): obj is URDFJoint {
    return 'isURDFJoint' in obj && Boolean((obj as { isURDFJoint?: boolean }).isURDFJoint);
}

export const TARGET_REACHED_TOLERANCE_RAD = 0.035;

export type ActuatedJointNames = ReadonlySet<string>;

/** Wraps an angle into (−π, π]. */
export function wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function getJointAngle(joint: URDFJoint): number {
    return joint.angle ?? joint.jointValue?.[0] ?? 0;
}

export function jointAngleError(joint: URDFJoint, actual: number, target: number): number {
    const diff = target - actual;
    return joint.jointType === 'continuous' ? wrapAngle(diff) : diff;
}

export function urdfNameOf(obj: URDFLink | URDFJoint): string {
    return obj.urdfName || obj.name;
}

export function getActuatedJointNames(joints?: JointControlState[]): ActuatedJointNames | undefined {
    if (joints && joints.length > 0) {
        return new Set(joints.map(j => j.name));
    }
    const handlerJoints = JointStateHandler.getInstance().getJoints();
    return handlerJoints.length > 0 ? new Set(handlerJoints.map(j => j.name)) : undefined;
}

export function isActuatorJoint(joint: URDFJoint | null, actuatedJointNames?: ActuatedJointNames): boolean {
    if (!joint || joint.jointType === 'fixed') return false;
    if ('mimicJoint' in joint && Boolean((joint as { mimicJoint?: string }).mimicJoint)) return false;

    if (actuatedJointNames && actuatedJointNames.size > 0) {
        return actuatedJointNames.has(urdfNameOf(joint));
    }
    return joint.jointType === 'revolute' || joint.jointType === 'continuous' || joint.jointType === 'prismatic';
}

export function findJointForLink(
    link: URDFLink,
    robot?: THREE.Object3D | null,
    actuatedJointNames?: ActuatedJointNames,
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

    if (robot && 'joints' in robot && robot.joints && typeof robot.joints === 'object') {
        const jointMap = robot.joints as Record<string, URDFJoint>;
        for (const j of Object.values(jointMap)) {
            if (isActuatorJoint(j, actuatedJointNames)) {
                const childLink = j.children.find(isURDFLink);
                if (childLink && (childLink === link || urdfNameOf(childLink) === urdfNameOf(link))) {
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
    actuatedJointNames?: ActuatedJointNames,
): URDFLink {
    let curr: URDFLink | null = link;
    while (curr && curr !== robot) {
        if (findJointForLink(curr, robot, actuatedJointNames)) {
            return curr;
        }
        curr = findParentLink(curr.parent, robot);
    }
    return link;
}

export function resolveActuatedLinkName(
    link: URDFLink,
    robot: THREE.Object3D,
    actuatedJointNames?: ActuatedJointNames,
): string {
    return urdfNameOf(findLinkWithJoint(link, robot, actuatedJointNames));
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
