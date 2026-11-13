/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MenuProps } from 'antd';
import { robotLabel } from './robotPackages.ts';
import type { RobotList } from './robotPackages.ts';

export function robotSwitchMenu(robots: RobotList, onSelect: (robotPackage: string) => void): MenuProps {
    return {
        selectable: true,
        selectedKeys: [robots.active],
        onClick: ({ key }) => {
            if (key !== robots.active) onSelect(key);
        },
        items: [
            { key: 'robot-title', type: 'group', label: 'SWITCH ROBOT (RESTARTS LUCY)' },
            ...robots.available.map((robotPackage) => ({ key: robotPackage, label: robotLabel(robotPackage) })),
        ],
    };
}
