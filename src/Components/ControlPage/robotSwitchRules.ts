/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Who currently drives the robot, as seen from this client. */
export type RobotController = 'none' | 'self' | 'other';

/**
 * Switching robot restarts Lucy, so it is only allowed while NOBODY controls the
 * robot: neither this client nor any other one on the rosbridge.
 * UI gating only: the backend switch service must refuse too.
 */
export const canSwitchRobot = (controller: RobotController) => controller === 'none';
