/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext } from 'react';
import { MotorOverheatContext } from '../contexts/MotorOverheatContext';
import { UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { useJointReadings } from '../hooks/useJointReadings';
import { OverheatMockControls } from './OverheatMockControls';
import { ColourLegends } from './ColourLegends';

const BOX: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 10px',
    fontFamily: 'monospace',
    fontSize: 11,
    color: UI_TEXT_PRIMARY_ON_DARK,
    zIndex: 10,
    pointerEvents: 'none',
};

const CELL: React.CSSProperties = { padding: '0 6px', textAlign: 'right' };
const HEAD: React.CSSProperties = { ...CELL, color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 };

const STS3215_NM_PER_AMP = 2.94 / 2.7;

const fixed = (value: number | undefined, digits: number) => (value === undefined ? '-' : value.toFixed(digits));

export const JointEffortDebug: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
    const { loads, currents, efforts, temperatures } = useJointReadings(isConnected);
    const medianTemperatures = useContext(MotorOverheatContext)?.temperatures;
    return (
        <div className="chamfer-box viewer-overlay-box" style={BOX}>
            {loads.size > 0 && <table>
                <thead>
                    <tr>
                        <th style={{ ...HEAD, textAlign: 'left' }}>JOINT</th>
                        <th style={HEAD}>LOAD</th>
                        <th style={HEAD}>CURRENT A</th>
                        <th style={HEAD}>EFFORT N·m</th>
                        <th style={HEAD}>I×Kt N·m</th>
                        <th style={HEAD}>TEMP °C</th>
                        <th style={HEAD}>3S MEDIAN °C</th>
                    </tr>
                </thead>
                <tbody>
                    {[...loads.keys()].map((name) => (
                        <tr key={name}>
                            <td style={{ ...CELL, textAlign: 'left' }}>{name}</td>
                            <td style={CELL}>{fixed(loads.get(name), 3)}</td>
                            <td style={CELL}>{fixed(currents.get(name), 3)}</td>
                            <td style={CELL}>{fixed(efforts.get(name), 3)}</td>
                            <td style={CELL}>{fixed(currents.has(name) ? currents.get(name)! * STS3215_NM_PER_AMP : undefined, 3)}</td>
                            <td style={CELL}>{fixed(temperatures.get(name), 0)}</td>
                            <td style={CELL}>{fixed(medianTemperatures?.get(name), 0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>}
            <OverheatMockControls />
            <ColourLegends />
        </div>
    );
};
