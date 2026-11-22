/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Dropdown, Tooltip } from 'antd';
import { DownOutlined, LoadingOutlined, RobotOutlined } from '@ant-design/icons';
import { robotLabel } from '../../Utils/robotPackages';
import type { RobotList } from '../../Utils/robotPackages';
import { HUD_TOOLTIP_DELAY_S } from './ControlToggleButton';
import { robotSwitchMenu } from '../../Utils/robotSwitchMenu.ts';

interface RobotMenuButtonProps {
    robotPackage: string;
    robots: RobotList | null;
    switchingTo: string | null;
    blockedReason: string | null;
    onSelect: (robotPackage: string) => void;
}

export const RobotMenuButton = ({ robotPackage, robots, switchingTo, blockedReason, onSelect }: RobotMenuButtonProps) => {
    const name = robotLabel(switchingTo ?? robotPackage);
    const reason = blockedReason ?? (robots && robots.available.length > 1 ? null : 'No other robot is installed');
    const button = (
        <button
            type="button"
            className="chamfer-box robot-menu-btn"
            disabled={reason !== null}
            aria-label={`Robot: ${name}`}
            aria-haspopup={reason === null ? 'menu' : undefined}
        >
            {switchingTo ? <LoadingOutlined className="robot-menu-icon" /> : <RobotOutlined className="robot-menu-icon" />}
            {name}
            <DownOutlined className="robot-menu-caret" />
        </button>
    );
    return (
        <Tooltip placement="bottomLeft" title={reason ?? 'Switch robot (restarts Lucy)'} mouseEnterDelay={HUD_TOOLTIP_DELAY_S}>
            {/* A disabled button fires no pointer events, so the wrapper carries the tooltip. */}
            <span className="robot-menu-slot">
                {reason === null && robots ? (
                    <Dropdown menu={robotSwitchMenu(robots, onSelect)} trigger={['click']} placement="bottomLeft">
                        {button}
                    </Dropdown>
                ) : button}
            </span>
        </Tooltip>
    );
};

export default RobotMenuButton;
