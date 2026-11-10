/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from 'antd';
import { DownOutlined, RobotOutlined } from '@ant-design/icons';
import { robotLabel } from '../../Utils/robotPackages';
import { HUD_TOOLTIP_DELAY_S } from './ControlToggleButton';
import type { RobotController } from './robotSwitchRules';

interface RobotMenuButtonProps {
    robotPackage: string;
    controller: RobotController;
}

const DISABLED_REASON: Record<RobotController, string> = {
    self: 'Turn CONTROL off to switch robot',
    other: 'Another client is controlling the robot: it must turn CONTROL off before the robot can be switched',
    // TODO(aes/latest merge): gate the switcher with canSwitchRobot(), not isSending.
    none: 'Robot switching is not available yet',
};

export const RobotMenuButton = ({ robotPackage, controller }: RobotMenuButtonProps) => {
    const name = robotLabel(robotPackage);
    return (
        <Tooltip placement="bottomLeft" title={DISABLED_REASON[controller]} mouseEnterDelay={HUD_TOOLTIP_DELAY_S}>
            {/* Disabled buttons don't trigger tooltips. */}
            <span className="robot-menu-slot">
                <button type="button" className="chamfer-box robot-menu-btn" disabled aria-label={`Robot: ${name}`}>
                    <RobotOutlined className="robot-menu-icon" />
                    {name}
                    <DownOutlined className="robot-menu-caret" />
                </button>
            </span>
        </Tooltip>
    );
};

export default RobotMenuButton;
