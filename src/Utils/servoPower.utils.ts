/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ServoPower = 'on' | 'off' | 'unknown';

export function servoPowerOf(voltages: ReadonlyMap<string, number>, minVolts: ReadonlyMap<string, number>): ServoPower {
    const checked = [...voltages].filter(([joint]) => minVolts.has(joint));
    if (checked.length === 0) return 'unknown';
    return checked.some(([joint, volts]) => volts < minVolts.get(joint)!) ? 'off' : 'on';
}
