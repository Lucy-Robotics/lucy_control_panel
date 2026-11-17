/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const LED_LINK_NAME = /_led_(\d+)$/;

export function ledIndexOf(linkName: string): number | null {
    const match = LED_LINK_NAME.exec(linkName);
    return match ? Number(match[1]) : null;
}

export function ledColorOf(colors: readonly number[], index: number): number | null {
    const rgb = (colors[index] ?? 0) & 0xffffff;
    return rgb === 0 ? null : rgb;
}
