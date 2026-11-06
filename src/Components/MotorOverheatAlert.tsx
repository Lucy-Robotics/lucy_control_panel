/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext } from 'react';
import { MotorOverheatContext } from '../contexts/MotorOverheatContext';
import { formatTemperature } from '../Utils/jointTemperature.utils';
import { HARD_LIMIT_CELSIUS, OVERHEAT_CELSIUS } from '../Utils/motorOverheat.utils';

const BOX: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: 'monospace',
    fontSize: 12,
    color: 'var(--color-text-primary)',
    background: 'var(--color-main-elevated)',
    border: '2px solid var(--color-status-error)',
};

const CONTINUE_BUTTON: React.CSSProperties = {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid var(--color-status-error)',
    color: 'var(--color-text-primary)',
    fontFamily: 'monospace',
    fontSize: 11,
};

export const MotorOverheatAlert: React.FC = () => {
    const overheat = useContext(MotorOverheatContext);
    if (!overheat || overheat.trippedJoints.size === 0) return null;

    const { temperatures, trippedJoints, canContinue, continueWithOverheat } = overheat;
    const atHardLimit = [...trippedJoints].some((joint) => (temperatures.get(joint) ?? 0) >= HARD_LIMIT_CELSIUS);

    return (
        <div role="alert" style={BOX}>
            <strong style={{ color: 'var(--color-status-error)' }}>MOTOR OVERHEATING: TORQUE OFF</strong>
            {[...trippedJoints].map((joint) => {
                const celsius = temperatures.get(joint);
                const cooled = celsius !== undefined && celsius <= OVERHEAT_CELSIUS;
                return (
                    <span key={joint}>
                        {joint}: {celsius === undefined ? 'no reading' : formatTemperature(celsius)}
                        {cooled ? ` (went over ${OVERHEAT_CELSIUS} °C, stays off until you continue)` : ` (limit ${OVERHEAT_CELSIUS} °C)`}
                    </span>
                );
            })}
            {atHardLimit && <span>Hard limit {HARD_LIMIT_CELSIUS} °C reached: let the motor cool down.</span>}
            {canContinue && (
                <button type="button" style={CONTINUE_BUTTON} onClick={continueWithOverheat}>
                    CONTINUE WITH OVERHEATED MOTOR
                </button>
            )}
        </div>
    );
};
