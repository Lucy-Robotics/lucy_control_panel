/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { deviceToBase, type Vec3 } from './phoneMotion.ts';
import { MAX_LEAD_M, SO101_MIN_END_EFFECTOR_Z_M } from './jogTeleop.ts';
import type { PadInput } from './gamepadLayout.ts';

export const STICK_DEADZONE = 0.15;
export const SLOWEST_SCALE = 0.2;
export const FINE_SCALE = 0.1;
export const STEP_M = 0.005;
export const FINE_STEP_M = 0.001;

export function stickResponse(value: number): number {
    const magnitude = Math.abs(value);
    if (magnitude < STICK_DEADZONE) return 0;
    const scaled = Math.min((magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE), 1);
    return Math.sign(value) * scaled * scaled;
}

export const speedScale = (slow: number, fine: boolean) => (1 - slow * (1 - SLOWEST_SCALE)) * (fine ? FINE_SCALE : 1);

export function stickDirection(input: PadInput, endEffector: Vec3, fine: boolean): Vec3 {
    const [x, y] = endEffector;
    const radius = Math.hypot(x, y);
    const outward = radius > 1e-6 ? [x / radius, y / radius] : [0, 0];
    const reach = stickResponse(input.reach);
    const swing = -stickResponse(input.swing);
    const direction: Vec3 = [
        outward[0] * reach - outward[1] * swing,
        outward[1] * reach + outward[0] * swing,
        stickResponse(input.lift),
    ];
    const length = Math.hypot(...direction);
    const limit = length > 1 ? 1 / length : 1;
    const scale = speedScale(input.slow, fine) * limit;
    return direction.map((d) => d * scale) as Vec3;
}

export function nudgeStep(nudge: PadInput['nudge'], fine: boolean): Vec3 {
    const size = fine ? FINE_STEP_M : STEP_M;
    return deviceToBase([nudge.right, nudge.forward, 0]).map((n) => n * size) as Vec3;
}

export function steppedTarget(target: Vec3, step: Vec3, endEffector: Vec3): Vec3 {
    const lead = target.map((t, i) => t + step[i] - endEffector[i]);
    const length = Math.hypot(...lead);
    const scale = length > MAX_LEAD_M ? MAX_LEAD_M / length : 1;
    const [x, y, z] = endEffector.map((e, i) => e + lead[i] * scale);
    return [x, y, Math.max(z, SO101_MIN_END_EFFECTOR_Z_M)];
}
