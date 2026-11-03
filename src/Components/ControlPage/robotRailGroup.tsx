/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LoadingOutlined, RobotOutlined } from '@ant-design/icons';
import type { RailGroup } from './CommandRail.tsx';
import { robotLabel } from '../../Utils/robotPackages.ts';
import type { RobotList } from '../../Utils/robotPackages.ts';

interface RobotRailGroupProps {
    robots: RobotList | null;
    switchingTo: string | null;
    canSwitch: boolean;
    onSelect: (robotPackage: string) => void;
}

export function robotRailGroup({ robots, switchingTo, canSwitch, onSelect }: RobotRailGroupProps): RailGroup | null {
    if (!robots || robots.available.length < 2) return null;

    return {
        key: 'robot',
        code: 'ROBOT',
        items: [
            {
                key: 'robot',
                icon: switchingTo ? <LoadingOutlined /> : <RobotOutlined />,
                label: `Robot: ${robotLabel(robots.active)} (click to switch)`,
                caption: 'SWITCH',
                detail: robotLabel(switchingTo ?? robots.active),
                disabled: !canSwitch || switchingTo !== null,
                disabledReason: switchingTo
                    ? `Switching to ${robotLabel(switchingTo)}…`
                    : 'Turn Control Robot ON to switch the robot',
                menu: {
                    selectable: true,
                    selectedKeys: [robots.active],
                    onClick: ({ key }) => {
                        if (key !== robots.active) onSelect(key);
                    },
                    items: [
                        { key: 'robot-title', type: 'group', label: 'SWITCH ROBOT (RESTARTS LUCY)' },
                        ...robots.available.map((robotPackage) => ({ key: robotPackage, label: robotLabel(robotPackage) })),
                    ],
                },
            },
        ],
    };
}
