/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { useJointReadings } from '../hooks/useJointReadings';
import { JointTemperatureReadout } from './JointTemperatureReadout';

const Reading: React.FC<{ label: string; value: number | undefined; digits: number; unit?: string }> = ({ label, value, digits, unit }) => (
    <>
        <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, marginLeft: 6 }}>{label}:</span>
        <span style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontWeight: 'bold' }}>
            {value === undefined ? '-' : `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`}
        </span>
    </>
);

export const JointReadingsLine: React.FC<{ jointName: string; isConnected: boolean }> = ({ jointName, isConnected }) => {
    const { loads, currents, efforts } = useJointReadings(isConnected);

    return (
        <>
            <Reading label="LOAD" value={loads.get(jointName)} digits={2} />
            <Reading label="CURRENT" value={currents.get(jointName)} digits={2} unit="A" />
            <Reading label="EFFORT" value={efforts.get(jointName)} digits={2} unit="N·m" />
            <JointTemperatureReadout jointName={jointName} />
        </>
    );
};
