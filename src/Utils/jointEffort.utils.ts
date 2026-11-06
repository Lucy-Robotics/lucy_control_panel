/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// shortcut: Feetech stall torque, the only actuator reporting effort; read it from the hardware config once exposed
export const FULL_SCALE_EFFORT_NM = 2.94;

const IDLE_ARC_RATIO = 0.02;

export function effortRatio(effortNm: number): number {
    return Math.min(Math.abs(effortNm) / FULL_SCALE_EFFORT_NM, 1);
}

export function effortArcRad(effortNm: number): number {
    return Math.max(effortRatio(effortNm), IDLE_ARC_RATIO) * 2 * Math.PI;
}

export function effortSweepSign(effortNm: number): 1 | -1 {
    return effortNm < 0 ? -1 : 1;
}

export function effortColor(effortNm: number): string {
    return `hsl(${Math.round(120 * (1 - effortRatio(effortNm)))}, 90%, 50%)`;
}

export function effortsByJoint(names: string[], efforts?: (number | null)[]): Map<string, number> {
    const byJoint = new Map<string, number>();
    names.forEach((name, i) => {
        const effort = efforts?.[i];
        if (typeof effort === 'number' && Number.isFinite(effort)) byJoint.set(name, effort);
    });
    return byJoint;
}
