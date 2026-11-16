/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { deviceToBase, type Vec3 } from './phoneMotion.ts';
import { SO101_MIN_END_EFFECTOR_Z_M } from './jogTeleop.ts';
import type { PadInput } from './gamepadLayout.ts';

export const STICK_DEADZONE = 0.15;
export const NORMAL_SCALE = 2;
export const PAD_MAX_LEAD_M = 0.08;
export const SLOWEST_SCALE = 0.2;
export const FINE_SCALE = 0.1;
export const STEP_M = 0.005;
export const FINE_STEP_M = 0.001;

export function stickResponse(value: number): number {
    const magnitude = Math.abs(value);
    if (magnitude < STICK_DEADZONE) return 0;
    const scaled = Math.min((magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE), 1);
    return Math.sign(value) * scaled ** 1.5;
}

export const speedScale = (slow: number, fine: boolean) =>
    (NORMAL_SCALE - slow * (NORMAL_SCALE - SLOWEST_SCALE)) * (fine ? FINE_SCALE : 1);

export const PITCH_RAD_PER_S = 1;
export const ROLL_RANGE_PER_S = 0.3;
export const MAX_PITCH_LEAD_RAD = 0.4;

export function padDirection(input: PadInput, fine: boolean): Vec3 {
    const [x, y] = deviceToBase([stickResponse(input.right), stickResponse(input.forward), 0]);
    const direction: Vec3 = [x, y, Number(input.up) - Number(input.down)];
    const length = Math.hypot(...direction);
    const scale = speedScale(input.slow, fine) * (length > 1 ? 1 / length : 1);
    return direction.map((d) => d * scale) as Vec3;
}

export function pitchedTarget(pitch: number, input: PadInput, fine: boolean, dt: number, pitchNow: number): number {
    const next = pitch + stickResponse(input.pitch) * PITCH_RAD_PER_S * speedScale(input.slow, fine) * dt;
    const led = Math.min(Math.max(next, pitchNow - MAX_PITCH_LEAD_RAD), pitchNow + MAX_PITCH_LEAD_RAD);
    return Math.min(Math.max(led, -Math.PI / 2), Math.PI / 2);
}

export function rolledOpening(opening: number, input: PadInput, fine: boolean, dt: number): number {
    const next = opening + stickResponse(input.roll) * ROLL_RANGE_PER_S * speedScale(input.slow, fine) * dt;
    return Math.min(Math.max(next, 0), 1);
}

export function nudgeStep(nudge: PadInput['nudge'], fine: boolean): Vec3 {
    const size = fine ? FINE_STEP_M : STEP_M;
    return deviceToBase([nudge.right, nudge.forward, 0]).map((n) => n * size) as Vec3;
}

export function steppedTarget(target: Vec3, step: Vec3, endEffector: Vec3): Vec3 {
    const lead = target.map((t, i) => t + step[i] - endEffector[i]);
    const length = Math.hypot(...lead);
    const scale = length > PAD_MAX_LEAD_M ? PAD_MAX_LEAD_M / length : 1;
    const [x, y, z] = endEffector.map((e, i) => e + lead[i] * scale);
    return [x, y, Math.max(z, SO101_MIN_END_EFFECTOR_Z_M)];
}
