/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { robotLabel } from '../../Utils/robotPackages.ts';

export type RobotController = 'none' | 'self' | 'other';

/** Switching restarts Lucy, so nobody may be controlling the robot. The backend must refuse too. */
export const canSwitchRobot = (controller: RobotController) => controller === 'none';

const BLOCKED_BY: Record<Exclude<RobotController, 'none'>, string> = {
    self: 'Turn CONTROL off to switch robot',
    other: 'Another client is controlling the robot: it must turn CONTROL off before the robot can be switched',
};

export function switchBlockedReason(controller: RobotController, switchingTo: string | null): string | null {
    if (switchingTo) return `Switching to ${robotLabel(switchingTo)}…`;
    return controller === 'none' ? null : BLOCKED_BY[controller];
}
