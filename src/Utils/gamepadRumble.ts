/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { effortRatio } from './jointEffort.utils.ts';

export const GRIP_FEEL = { from: 0.1, full: 0.5 };
export const STRAIN = { from: 0.35, full: 0.8 };

export interface Rumble {
    weak: number;
    strong: number;
}

const ramp = (value: number, { from, full }: { from: number; full: number }) =>
    Math.min(Math.max((value - from) / (full - from), 0), 1);

export function rumbleFor(
    loads: ReadonlyMap<string, number>,
    gripJoint: string,
    overheated: ReadonlySet<string>,
): Rumble {
    let strain = 0;
    for (const [joint, load] of loads) {
        if (joint !== gripJoint) strain = Math.max(strain, effortRatio(load));
    }
    return {
        weak: ramp(effortRatio(loads.get(gripJoint) ?? 0), GRIP_FEEL),
        strong: overheated.size > 0 ? 1 : ramp(strain, STRAIN),
    };
}
