/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Modal } from 'antd';
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

const confirmSwitch = (robotPackage: string, onSelect: (robotPackage: string) => void) => Modal.confirm({
    title: `Switch to ${robotLabel(robotPackage)}?`,
    content: 'The Lucy stack restarts on this robot. The panel reconnects once it is back up.',
    okText: 'Switch robot',
    okType: 'danger',
    onOk: () => onSelect(robotPackage),
});

export function robotRailGroup({ robots, switchingTo, canSwitch, onSelect }: RobotRailGroupProps): RailGroup | null {
    if (!robots || robots.available.length < 2) return null;

    return {
        key: 'robot',
        code: 'ROBOT',
        lead: true,
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
                        if (key !== robots.active) confirmSwitch(key, onSelect);
                    },
                    items: [
                        { key: 'robot-title', type: 'group', label: 'ROBOT' },
                        ...robots.available.map((robotPackage) => ({ key: robotPackage, label: robotLabel(robotPackage) })),
                    ],
                },
            },
        ],
    };
}
