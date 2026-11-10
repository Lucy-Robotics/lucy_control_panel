/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext } from 'react';
import { MotorOverheatContext } from '../contexts/MotorOverheatContext';
import { UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { formatTemperature } from '../Utils/jointTemperature.utils';

export const JointTemperatureReadout: React.FC<{ jointName: string }> = ({ jointName }) => {
    const temperature = useContext(MotorOverheatContext)?.temperatures.get(jointName);
    if (temperature === undefined) return null;

    return (
        <>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, marginLeft: 6 }}>TEMP:</span>
            <span style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontWeight: 'bold' }}>{formatTemperature(temperature)}</span>
        </>
    );
};
