/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HARD_LIMIT_CELSIUS, OVERHEAT_CELSIUS } from './motorOverheat.utils.ts';

export type Rgb = [number, number, number];

export const COOL_MOTOR_CELSIUS = 40;

const HOT_STOPS: { celsius: number; rgb: Rgb }[] = [
    { celsius: OVERHEAT_CELSIUS, rgb: [1, 0.55, 0] },
    { celsius: HARD_LIMIT_CELSIUS, rgb: [0.86, 0, 0] },
];

export function motorHeat(celsius: number): number {
    return Math.min(Math.max((celsius - COOL_MOTOR_CELSIUS) / (HARD_LIMIT_CELSIUS - COOL_MOTOR_CELSIUS), 0), 1);
}

export function motorTemperatureRgb(celsius: number, cool: Rgb = [0, 0, 0]): Rgb {
    const stops = [{ celsius: COOL_MOTOR_CELSIUS, rgb: cool }, ...HOT_STOPS];
    const upper = stops.findIndex((stop) => celsius <= stop.celsius);
    if (upper === 0) return [...stops[0].rgb];
    if (upper === -1) return [...stops[stops.length - 1].rgb];
    const from = stops[upper - 1];
    const to = stops[upper];
    const blend = (celsius - from.celsius) / (to.celsius - from.celsius);
    return from.rgb.map((channel, i) => channel + (to.rgb[i] - channel) * blend) as Rgb;
}
