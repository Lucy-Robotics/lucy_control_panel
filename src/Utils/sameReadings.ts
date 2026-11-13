/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !(value instanceof Map);

export function sameReadings(a: unknown, b: unknown): boolean {
    if (a instanceof Map && b instanceof Map) return a.size === b.size && [...a].every(([key, value]) => b.get(key) === value);
    if (!isRecord(a) || !isRecord(b)) return Object.is(a, b);
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => key in b && sameReadings(a[key], b[key]));
}
