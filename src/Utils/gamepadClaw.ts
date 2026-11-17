/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const CLAW_STEP_PER_S = 0.6;
export const CLAW_SEND_STEP = 0.01;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function restOpening(rest: number, open: boolean, close: boolean, dt: number): number {
    return clamp01(rest + (Number(open) - Number(close)) * CLAW_STEP_PER_S * dt);
}

export const clawOpenness = (rest: number, squeeze: number) => clamp01(rest) * (1 - clamp01(squeeze));

export const clawMoved = (sent: number | null, next: number) => sent === null || Math.abs(next - sent) >= CLAW_SEND_STEP;
