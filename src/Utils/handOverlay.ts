/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ScreenPoint {
    x: number;
    y: number;
}

export interface HandOverlayStyle {
    lineWidth: number;
    radius: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function handSizePx(landmarks: ScreenPoint[], width: number, height: number): number {
    const xs = landmarks.map((p) => p.x * width);
    const ys = landmarks.map((p) => p.y * height);
    return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

export function handOverlayStyle(sizePx: number): HandOverlayStyle {
    return {
        lineWidth: clamp(sizePx / 60, 1, 6),
        radius: clamp(sizePx / 45, 1.5, 7),
    };
}
