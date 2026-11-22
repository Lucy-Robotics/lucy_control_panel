/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Space } from 'antd';

export interface WizardFooterProps {
    /** Leaving the session: always bottom left. */
    left?: React.ReactNode;
    /** Ordered left to right; the step's main action goes last, bottom right. */
    right?: React.ReactNode;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({ left, right }) => (
    <div
        data-testid="calibration-footer"
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            paddingTop: 12,
            marginTop: 12,
            borderTop: '1px solid var(--color-line)',
        }}
    >
        <Space wrap>{left}</Space>
        <Space wrap>{right}</Space>
    </div>
);
