/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type RobotController = 'none' | 'self' | 'other';

/** Switching restarts Lucy, so nobody may be controlling the robot. The backend must refuse too. */
export const canSwitchRobot = (controller: RobotController) => controller === 'none';
