/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Vec3 = [number, number, number];

export interface MotionState {
    velocity: Vec3;
    displacement: Vec3;
    stillForS: number;
}

export const REST_MOTION: MotionState = { velocity: [0, 0, 0], displacement: [0, 0, 0], stillForS: 0 };

export const ACCEL_DEADZONE_MPS2 = 0.15;
export const VELOCITY_LEAK_PER_S = 1;
export const STILL_RESET_S = 0.1;
export const MAX_STEP_S = 0.1;
export const TELEOP_GAIN = 1;
export const MAX_REACH_M = 0.3;

const DEVICE_TO_BASE: ReadonlyArray<readonly [axis: number, sign: number]> = [
    [0, -1],
    [1, -1],
    [2, 1],
];

const deadzone = (value: number) => (Math.abs(value) < ACCEL_DEADZONE_MPS2 ? 0 : value);

export function integrateMotion(state: MotionState, acceleration: Vec3, dt: number): MotionState {
    if (!(dt > 0)) return state;
    const step = Math.min(dt, MAX_STEP_S);
    const felt = acceleration.map(deadzone) as Vec3;
    const stillForS = felt.every((a) => a === 0) ? state.stillForS + step : 0;
    const leak = stillForS >= STILL_RESET_S ? 0 : Math.exp(-VELOCITY_LEAK_PER_S * step);
    const velocity = state.velocity.map((v, i) => v * leak + felt[i] * step) as Vec3;
    const displacement = state.displacement.map((d, i) => d + velocity[i] * step) as Vec3;
    return { velocity, displacement, stillForS };
}

export function deviceToBase(vector: Vec3): Vec3 {
    return DEVICE_TO_BASE.map(([axis, sign]) => sign * vector[axis]) as Vec3;
}

export function teleopTarget(origin: Vec3, displacement: Vec3): Vec3 {
    const offset = deviceToBase(displacement).map((d) => d * TELEOP_GAIN) as Vec3;
    const length = Math.hypot(...offset);
    const scale = length > MAX_REACH_M ? MAX_REACH_M / length : 1;
    return origin.map((o, i) => o + offset[i] * scale) as Vec3;
}
