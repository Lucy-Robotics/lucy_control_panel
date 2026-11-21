/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const MESH_SIMPLIFY_ERROR = { full: 0, balanced: 0.0005, light: 0.001 } as const;

export type MeshQuality = keyof typeof MESH_SIMPLIFY_ERROR;

export const MESH_QUALITIES = Object.keys(MESH_SIMPLIFY_ERROR) as MeshQuality[];
