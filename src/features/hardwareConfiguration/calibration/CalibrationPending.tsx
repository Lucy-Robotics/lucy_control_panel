/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { LucyLoader } from '../../../Components/LucyLoader.tsx';

export const CalibrationPending: React.FC = () => (
    <div data-testid="calibration-pending" style={{ height: '100%' }}>
        <LucyLoader label="Checking calibration support" />
    </div>
);
