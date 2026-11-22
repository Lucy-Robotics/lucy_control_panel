/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addAfterEffect, addEffect } from '@react-three/fiber';

const SCREEN_REFRESH_MS = 1000 / 60;

let frameStartedAt = 0;
let lastFrameMs = 0;

export const lastFrameCostMs = () => lastFrameMs;

export function measureFrameCost(): () => void {
    const stopStart = addEffect(() => { frameStartedAt = performance.now(); });
    const stopEnd = addAfterEffect(() => {
        const startedAt = frameStartedAt;
        lastFrameMs = performance.now() - startedAt;
        // The next animation frame waits for the GPU (or software renderer) to finish this one.
        requestAnimationFrame(() => {
            lastFrameMs = Math.max(lastFrameMs, performance.now() - startedAt - SCREEN_REFRESH_MS);
        });
    });
    return () => { stopStart(); stopEnd(); };
}
