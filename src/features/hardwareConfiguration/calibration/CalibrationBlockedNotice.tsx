/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Alert } from 'antd';
import type { HealthCheck } from './calibrationModel.ts';
import { CalibrationHealthChecks } from './CalibrationHealthChecks.tsx';

export const CalibrationBlockedNotice: React.FC<{ failing: HealthCheck[] }> = ({ failing }) => (
    <Alert
        type="error"
        showIcon
        data-testid="calibration-blocked"
        message="Calibration is blocked until every check is green"
        description={failing.length > 0 ? <CalibrationHealthChecks health={failing} /> : undefined}
        style={{ marginBottom: 12 }}
    />
);
