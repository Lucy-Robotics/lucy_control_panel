/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SavedPose } from '../Services/storage.service.ts';

export const isJointAnglePose = (pose: SavedPose): boolean => pose.unit === 'joint';
