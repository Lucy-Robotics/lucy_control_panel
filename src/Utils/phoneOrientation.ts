/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

export type Quat = [number, number, number, number];

const DEG = Math.PI / 180;
const DEVICE_TO_BASE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
const BASE_TO_DEVICE = DEVICE_TO_BASE.clone().invert();

export function deviceQuaternion(alpha: number, beta: number, gamma: number): THREE.Quaternion {
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(beta * DEG, gamma * DEG, alpha * DEG, 'ZXY'));
}

export function orientationInBase(rest: THREE.Quaternion, current: THREE.Quaternion): Quat {
    const sinceRest = rest.clone().invert().multiply(current);
    return DEVICE_TO_BASE.clone().multiply(sinceRest).multiply(BASE_TO_DEVICE).toArray() as Quat;
}
