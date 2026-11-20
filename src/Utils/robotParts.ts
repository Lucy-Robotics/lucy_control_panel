/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';
import type { URDFJoint, URDFLink, URDFRobot } from 'urdf-loader';
import { isMotorVisual } from './motorMeshes';
import {
    findJointForLink,
    findLinkWithJoint,
    findParentLink,
    isActuatorJoint,
    isURDFJoint,
    isURDFLink,
    urdfNameOf,
    type ActuatedJointNames,
} from './robotModel.utils';

export type PartNameOf = (object: THREE.Object3D) => string | null;

function isInMotor(object: THREE.Object3D, link: URDFLink): boolean {
    for (let node: THREE.Object3D | null = object; node && node !== link; node = node.parent) {
        if (isMotorVisual(node)) return true;
    }
    return false;
}

function partDrivenFrom(link: URDFLink, actuatedJointNames?: ActuatedJointNames): string | null {
    const driven = link.children.filter((child): child is URDFJoint => isURDFJoint(child) && isActuatorJoint(child, actuatedJointNames));
    const movedLink = driven.length === 1 ? driven[0].children.find(isURDFLink) : undefined;
    return movedLink ? urdfNameOf(movedLink) : null;
}

export function robotPartNames(robot: URDFRobot, actuatedJointNames?: ActuatedJointNames): PartNameOf {
    return (object) => {
        const link = findParentLink(object, robot);
        if (!link) return null;
        const motorPart = isInMotor(object, link) ? partDrivenFrom(link, actuatedJointNames) : null;
        if (motorPart) return motorPart;
        const movedLink = findLinkWithJoint(link, robot, actuatedJointNames);
        return findJointForLink(movedLink, robot, actuatedJointNames) ? urdfNameOf(movedLink) : null;
    };
}
