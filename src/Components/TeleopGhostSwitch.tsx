/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Space } from 'antd';
import { StreamSwitch } from './StreamSwitch';
import { UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme';
import { setTeleopGhostVisible, useTeleopGhostVisible } from '../hooks/useTeleopGhostVisible';

export const TeleopGhostSwitch: React.FC = () => {
    const isVisible = useTeleopGhostVisible();
    return (
    <span onMouseDown={(e) => e.stopPropagation()} title="Show the ghost while Hands drives the robot">
        <Space size={4} align="center">
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontFamily: 'monospace', fontSize: 10 }}>GHOST</span>
            <StreamSwitch value={isVisible} onChange={setTeleopGhostVisible} />
        </Space>
    </span>
    );
};
