/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { CheckCircleFilled, CloseCircleFilled, WarningFilled } from '@ant-design/icons';
import type { HealthCheck } from './calibrationModel.ts';

const FIX_HINTS: Record<string, string> = {
    firmware: 'Start Lucy with Real Hardware selected.',
    adapter: 'Plug in the arm\'s USB adapter. If several are connected, choose one below.',
    serial: 'This adapter has no usable serial number, so the arm can\'t be identified.',
    servos: 'Check the arm\'s power supply and the servo cables.',
    torque: 'Turn Control Robot off.',
    control_lock: 'Turn Control Robot off, in every open panel.',
    temperature: 'Let the servos cool down before continuing.',
    load: 'Something may be stuck or pushing on the arm.',
};

export const CalibrationHealthChecks: React.FC<{ health: HealthCheck[] }> = ({ health }) => (
    <ul data-testid="calibration-health" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {health.map((check) => {
            const Icon = check.ok ? CheckCircleFilled : check.required ? CloseCircleFilled : WarningFilled;
            const color = check.ok
                ? 'var(--color-status-active)'
                : check.required
                    ? 'var(--color-status-error)'
                    : 'var(--color-status-warning)';
            return (
                <li key={check.id} data-check={check.id} data-ok={check.ok} style={{ padding: '4px 0' }}>
                    <Icon style={{ color, marginRight: 8 }} aria-label={check.ok ? 'OK' : 'Problem'} />
                    {check.label}
                    {!check.ok && FIX_HINTS[check.id] && (
                        <div style={{ marginLeft: 22, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                            {FIX_HINTS[check.id]}
                        </div>
                    )}
                </li>
            );
        })}
    </ul>
);
