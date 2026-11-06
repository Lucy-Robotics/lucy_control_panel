/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from 'antd';
import type { ControlArm } from './CommandRail';
import { JoystickOutlined } from './JoystickIcon';

/** Tooltip delay of the controls over the 3D view, in seconds (antd's unit). */
export const HUD_TOOLTIP_DELAY_S = 0.3;

/** Compact CONTROL ON/OFF button, shown over the docked 3D view. */
export const ControlToggleButton = ({ isOn, onToggle, hint }: ControlArm) => (
    <Tooltip placement="bottomRight" title={hint} mouseEnterDelay={HUD_TOOLTIP_DELAY_S}>
        <button
            type="button"
            className={`chamfer-box control-toggle${isOn ? ' is-on' : ''}`}
            aria-label="Control Robot"
            aria-pressed={isOn}
            onClick={onToggle}
        >
            <JoystickOutlined className="control-toggle-icon" />
            CONTROL
            <span className="control-toggle-state">{isOn ? 'ON' : 'OFF'}</span>
        </button>
    </Tooltip>
);

export default ControlToggleButton;
