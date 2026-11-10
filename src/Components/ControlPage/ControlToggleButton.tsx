/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from 'antd';
import { JoystickOutlined } from './JoystickIcon';

export const HUD_TOOLTIP_DELAY_S = 0.3;

interface ControlToggleButtonProps {
    isOn: boolean;
    onToggle: () => void;
    hint: string;
}

export const ControlToggleButton = ({ isOn, onToggle, hint }: ControlToggleButtonProps) => (
    <Tooltip placement="bottomRight" title={hint} mouseEnterDelay={HUD_TOOLTIP_DELAY_S}>
        <button
            type="button"
            className={`chamfer-box control-toggle${isOn ? ' is-on' : ''}`}
            aria-label="Control Robot"
            aria-pressed={isOn}
            onClick={onToggle}
        >
            <JoystickOutlined className="control-toggle-icon" />
            <span className="control-toggle-label">
                <span className={isOn ? undefined : 'is-current'}>TAKE CONTROL</span>
                <span className={isOn ? 'is-current' : undefined}>RELEASE CONTROL</span>
            </span>
        </button>
    </Tooltip>
);

export default ControlToggleButton;
