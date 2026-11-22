/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './react-harness.ts';
import ReactThreeTestRenderer from '@react-three/test-renderer';

const frames = globalThis as unknown as { cancelAnimationFrame?: (id: number) => void; requestAnimationFrame?: (cb: () => void) => number };
frames.requestAnimationFrame ??= (callback) => setTimeout(callback, 16) as unknown as number;
frames.cancelAnimationFrame ??= (id) => clearTimeout(id);
window.requestAnimationFrame ??= frames.requestAnimationFrame as typeof window.requestAnimationFrame;
window.cancelAnimationFrame ??= frames.cancelAnimationFrame as typeof window.cancelAnimationFrame;

export const renderScene = ReactThreeTestRenderer.create;
