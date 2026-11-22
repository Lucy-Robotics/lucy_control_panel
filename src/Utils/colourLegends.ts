/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { effortColor } from './effortArrow.utils.ts';
import { FULL_HEAT_LOAD } from './jointEffort.utils.ts';
import { motorTemperatureRgb } from './motorTemperatureColor.ts';

const SAMPLES = 24;
export const TEMPERATURE_LEGEND_CELSIUS = { min: 30, max: 65 } as const;

const toCss = ([r, g, b]: number[]) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

function gradient(colourAt: (fraction: number) => string): string {
    const stops = Array.from({ length: SAMPLES + 1 }, (_, i) => `${colourAt(i / SAMPLES)} ${((i / SAMPLES) * 100).toFixed(1)}%`);
    return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function temperatureLegendGradient(): string {
    const { min, max } = TEMPERATURE_LEGEND_CELSIUS;
    return gradient((fraction) => toCss(motorTemperatureRgb(min + fraction * (max - min))));
}

export function effortLegendGradient(): string {
    return gradient((fraction) => effortColor(fraction * FULL_HEAT_LOAD));
}

export function legendPosition(value: number, min: number, max: number): string {
    return `${(((value - min) / (max - min)) * 100).toFixed(1)}%`;
}
