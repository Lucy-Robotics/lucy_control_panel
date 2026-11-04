/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as handsModule from "@mediapipe/hands";
import * as drawingModule from "@mediapipe/drawing_utils";

type MediaPipeExports = typeof handsModule & typeof drawingModule;

function exported<K extends keyof MediaPipeExports>(module: Partial<MediaPipeExports>, name: K): MediaPipeExports[K] {
    return module[name] ?? (globalThis as unknown as MediaPipeExports)[name];
}

export const Hands = exported(handsModule, "Hands");
export const HAND_CONNECTIONS = exported(handsModule, "HAND_CONNECTIONS");
export const drawConnectors = exported(drawingModule, "drawConnectors");
export const drawLandmarks = exported(drawingModule, "drawLandmarks");
