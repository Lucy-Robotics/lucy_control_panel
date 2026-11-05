/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Point3D = { x: number; y: number; z: number };
export type FingerPoints = { tip: Point3D; dip: Point3D; pip: Point3D; mcp: Point3D; wrist: Point3D };

const RELAXED_MEAN_BEND_RAD = 0.6;
const FLEXED_MEAN_BEND_RAD = 1;
const THUMB_RELAXED_MEAN_BEND_RAD = 0.45;
const THUMB_FLEXED_MEAN_BEND_RAD = 0.75;
const PINCHED_DISTANCE = 0.15;
const OPEN_DISTANCE = 0.9;

const WRIST = 0;
const THUMB_TIP = 4;
const MIDDLE_MCP = 9;
const FINGER_TIPS = [8, 12, 16, 20];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const progress = (value: number, start: number, end: number) => (clamp(value, start, end) - start) / (end - start);

const distance3D = (a: Point3D, b: Point3D) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function bendAngle(a: Point3D, joint: Point3D, c: Point3D): number {
    const v1 = { x: a.x - joint.x, y: a.y - joint.y, z: a.z - joint.z };
    const v2 = { x: c.x - joint.x, y: c.y - joint.y, z: c.z - joint.z };
    const magnitudes = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z);
    if (magnitudes === 0) return 0;

    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    return Math.PI - Math.acos(clamp(dot / magnitudes, -1, 1));
}

const meanBend = ({ tip, dip, pip, mcp, wrist }: FingerPoints) =>
    (bendAngle(tip, dip, pip) + bendAngle(dip, pip, mcp) + bendAngle(pip, mcp, wrist)) / 3;

export const fingerFlex = (finger: FingerPoints) =>
    progress(meanBend(finger), RELAXED_MEAN_BEND_RAD, FLEXED_MEAN_BEND_RAD);

export const thumbFlex = (thumb: FingerPoints) =>
    progress(meanBend(thumb), THUMB_RELAXED_MEAN_BEND_RAD, THUMB_FLEXED_MEAN_BEND_RAD);

export function clawOpenness(hand: Point3D[]): number {
    const tips = FINGER_TIPS.map((index) => hand[index]);
    const averageTip: Point3D = {
        x: tips.reduce((sum, p) => sum + p.x, 0) / tips.length,
        y: tips.reduce((sum, p) => sum + p.y, 0) / tips.length,
        z: tips.reduce((sum, p) => sum + p.z, 0) / tips.length,
    };

    const handScale = distance3D(hand[WRIST], hand[MIDDLE_MCP]);
    const pinchDistance = handScale > 0 ? distance3D(hand[THUMB_TIP], averageTip) / handScale : 0;
    return progress(pinchDistance, PINCHED_DISTANCE, OPEN_DISTANCE);
}
