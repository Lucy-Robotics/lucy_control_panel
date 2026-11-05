/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { deviceToBase, type Vec3 } from './phoneMotion.ts';

export const JOG_SPEED_MPS = 0.15;
export const MAX_LEAD_M = 0.05;
export const SO101_MIN_END_EFFECTOR_Z_M = 0.035;

const JOG_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight']);

export const isJogCode = (code: string) => JOG_CODES.has(code);

const held = (pressed: ReadonlySet<string>, ...codes: string[]) => (codes.some((code) => pressed.has(code)) ? 1 : 0);

export function jogDirection(pressed: ReadonlySet<string>): Vec3 {
    return deviceToBase([
        held(pressed, 'KeyD') - held(pressed, 'KeyA'),
        held(pressed, 'KeyW') - held(pressed, 'KeyS'),
        held(pressed, 'Space') - held(pressed, 'ShiftLeft', 'ShiftRight'),
    ]);
}

export function jogTarget(target: Vec3, direction: Vec3, dt: number, endEffector: Vec3): Vec3 {
    const lead = target.map((t, i) => t + direction[i] * JOG_SPEED_MPS * dt - endEffector[i]);
    const length = Math.hypot(...lead);
    const scale = length > MAX_LEAD_M ? MAX_LEAD_M / length : 1;
    const [x, y, z] = endEffector.map((e, i) => e + lead[i] * scale);
    return [x, y, Math.max(z, SO101_MIN_END_EFFECTOR_Z_M)];
}
