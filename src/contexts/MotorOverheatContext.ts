/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext } from 'react';
import type { MotorOverheat } from '../hooks/useMotorOverheatGuard';

export const MotorOverheatContext = createContext<MotorOverheat | null>(null);
