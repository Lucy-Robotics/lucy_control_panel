/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext, useState } from 'react';
import { Button, Select } from 'antd';
import { MotorOverheatContext } from '../contexts/MotorOverheatContext';
import { UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { overheatMock, useOverheatMock } from '../Services/overheatMock';

const MOCK_STATES = [
    { label: 'WARM 45', celsius: 45 },
    { label: 'OVERHEAT 52', celsius: 52 },
    { label: 'HARD LIMIT 62', celsius: 62 },
    { label: 'COOLED 47', celsius: 47 },
];

export const OverheatMockControls: React.FC = () => {
    const jointNames = [...(useContext(MotorOverheatContext)?.temperatures.keys() ?? [])];
    const mocked = useOverheatMock();
    const [chosen, setChosen] = useState<string | null>(null);
    const joint = chosen ?? jointNames[0];
    if (!joint) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, pointerEvents: 'auto' }}>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>MOCK</span>
            <Select size="small" value={joint} onChange={setChosen} style={{ width: 120 }}
                options={jointNames.map((name) => ({ value: name, label: name }))} />
            {MOCK_STATES.map(({ label, celsius }) => (
                <Button key={label} size="small" type={mocked.get(joint) === celsius ? 'primary' : 'default'}
                    onClick={() => overheatMock.set(joint, celsius)}>
                    {label}
                </Button>
            ))}
            <Button size="small" danger disabled={mocked.size === 0} onClick={overheatMock.clear}>CLEAR</Button>
        </div>
    );
};
