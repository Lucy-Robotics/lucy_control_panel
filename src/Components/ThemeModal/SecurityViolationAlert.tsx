/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Alert, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { TEXT_PRIMARY } from '../../Constants/theme';
import type { CssViolation } from '../../Services/cssSecurity.service';

export interface SecurityAlertData {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    violations?: CssViolation[];
}

interface SecurityViolationAlertProps {
    alert: SecurityAlertData | null;
    onClose: () => void;
}

export const SecurityViolationAlert: React.FC<SecurityViolationAlertProps> = ({ alert, onClose }) => {
    if (!alert) return null;

    return (
        <Alert
            message={alert.title}
            description={
                <div>
                    <div style={{ marginBottom: alert.violations && alert.violations.length > 0 ? 8 : 0 }}>
                        {alert.description}
                    </div>
                    {alert.violations && alert.violations.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                            {alert.violations.map((violation, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 11,
                                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                        padding: '4px 8px',
                                        borderRadius: 3,
                                    }}
                                >
                                    <Tag
                                        color={
                                            violation.severity === 'critical'
                                                ? 'error'
                                                : violation.severity === 'high'
                                                    ? 'warning'
                                                    : 'default'
                                        }
                                        style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}
                                    >
                                        {violation.severity.toUpperCase()}
                                    </Tag>
                                    <span style={{ color: TEXT_PRIMARY }}>{violation.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            }
            type={alert.type}
            icon={alert.type === 'success' ? <CheckCircleOutlined /> : undefined}
            showIcon
            closable
            onClose={onClose}
            style={{ border: '1px solid var(--color-secondary)' }}
        />
    );
};
