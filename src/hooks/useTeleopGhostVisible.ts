/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { storedVisibility } from './storedVisibility';

const teleopGhostVisibility = storedVisibility('teleopGhostVisible', false);

export const setTeleopGhostVisible = teleopGhostVisibility.set;
export const useTeleopGhostVisible = teleopGhostVisibility.useValue;
