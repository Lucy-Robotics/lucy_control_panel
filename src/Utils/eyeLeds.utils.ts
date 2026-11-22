/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const LEDS_PER_EYE = 12;

const LED_LINK_NAME = /_(left|right)_led_(\d+)$|_led_(\d+)$/;
const EYE_LED_IN_URDF = /<link name="[^"]*_(left|right)_led_\d+"/;

export function ledIndexOf(linkName: string): number | null {
    const match = LED_LINK_NAME.exec(linkName);
    return match ? Number(match[2] ?? match[3]) : null;
}

export function ledEyeOf(linkName: string): 'left' | 'right' | null {
    return (LED_LINK_NAME.exec(linkName)?.[1] as 'left' | 'right' | undefined) ?? null;
}

export function ledSlotOf(linkName: string, colorCount: number): number | null {
    const index = ledIndexOf(linkName);
    if (index === null) return null;
    const perEye = colorCount > LEDS_PER_EYE && LED_LINK_NAME.exec(linkName)?.[1] === 'right';
    return perEye ? LEDS_PER_EYE + index : index;
}

export function ledColorOf(colors: readonly number[], index: number): number | null {
    const rgb = (colors[index] ?? 0) & 0xffffff;
    return rgb === 0 ? null : rgb;
}

export function eyeColors(left: number, right: number): number[] {
    return [...Array<number>(LEDS_PER_EYE).fill(left), ...Array<number>(LEDS_PER_EYE).fill(right)];
}

export function hasEyeLeds(urdf: string | null): boolean {
    return urdf !== null && EYE_LED_IN_URDF.test(urdf);
}

export const hexToRgb = (hex: string): number => parseInt(hex.slice(1), 16);
export const rgbToHex = (rgb: number): string => `#${(rgb & 0xffffff).toString(16).padStart(6, '0')}`;
