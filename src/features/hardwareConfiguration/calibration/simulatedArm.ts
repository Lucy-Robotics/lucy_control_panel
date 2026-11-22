/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CalibrationStatus } from './calibrationModel.ts';

const SIMULATED_ADAPTER_SERIAL = 'SIMULATED';

/** True when the calibration node drives its simulated arm (mock or Gazebo stack), not real servos. */
export function isSimulatedArm(status: Pick<CalibrationStatus, 'adapters'>): boolean {
    return status.adapters.some((adapter) => adapter.serial === SIMULATED_ADAPTER_SERIAL);
}
