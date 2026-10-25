/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { UrdfJointLimitRad } from '../../../hooks/useUrdfJointLimits.ts';

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;

/**
 * Set `scale` / `offset` so the joint's whole URDF range maps onto the servo travel
 * [limit_min, limit_max], with LucySystemHardware's `servo = joint / (direction * scale) + offset`.
 * A `default` left outside the travel moves to the servo angle of the URDF zero pose.
 * Rows without a URDF range or a valid travel are returned unchanged.
 */
export function withUrdfCalibration(
    row: Record<string, unknown>,
    urdfLimits: Map<string, UrdfJointLimitRad>,
): Record<string, unknown> {
    const urdf = urdfLimits.get(String(row.urdf_joint ?? '').trim());
    const min = Number(row.limit_min);
    const max = Number(row.limit_max);
    if (!urdf || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return row;

    const direction = Number(row.direction) === -1 ? -1 : 1;
    const scale = (urdf.upperRad - urdf.lowerRad) / (max - min);
    // Inverted servos reach their max at the URDF lower limit.
    const offset = (direction === 1 ? min : max) - urdf.lowerRad / (direction * scale);
    const next: Record<string, unknown> = { ...row, scale: round5(scale), offset: round5(offset) };

    const def = Number(row.default);
    if (!Number.isFinite(def) || def < min || def > max) {
        next.default = round5(Math.min(max, Math.max(min, offset)));
    }
    return next;
}
