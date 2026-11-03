/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';

export const COMMAND_RAIL_WIDTH = 74;

export interface RailItem {
    key: string;
    icon: ReactNode;
    label: string;
    caption: string;
    detail?: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    disabledReason?: string;
    danger?: boolean;
    menu?: MenuProps;
}

export interface RailGroup {
    key: string;
    label: string;
    items: RailItem[];
    pinEnd?: boolean;
    lead?: boolean;
}

interface CommandRailProps {
    groups: RailGroup[];
    orientation: 'vertical' | 'horizontal';
    className?: string;
    style?: React.CSSProperties;
}

export const CommandRail = React.forwardRef<HTMLDivElement, CommandRailProps>(
    ({ groups, orientation, className = '', style }, ref) => {
        const placement = orientation === 'vertical' ? 'right' : 'top';

        const renderItem = (item: RailItem) => {
            const button = (
                <button
                    type="button"
                    className={`rail-btn${item.danger ? ' rail-btn-danger' : ''}`}
                    aria-label={item.label}
                    aria-pressed={item.active}
                    aria-haspopup={item.menu ? 'menu' : undefined}
                    disabled={item.disabled}
                    onClick={item.menu ? undefined : item.onClick}
                >
                    <span className="rail-icon">{item.icon}</span>
                    <span className="rail-caption">{item.caption}</span>
                    {item.detail && <span className="rail-detail">{item.detail}</span>}
                </button>
            );

            return (
                <Tooltip
                    key={item.key}
                    placement={placement}
                    title={item.disabled && item.disabledReason ? item.disabledReason : item.label}
                >
                    <span className="rail-slot">
                        {item.menu && !item.disabled ? (
                            <Dropdown menu={item.menu} trigger={['click']} placement="topLeft">
                                {button}
                            </Dropdown>
                        ) : button}
                    </span>
                </Tooltip>
            );
        };

        const renderGroup = (group: RailGroup) => (
            <div className="rail-group" role="group" aria-label={group.code}>
                <span className="rail-code" aria-hidden>{group.code}</span>
                {group.items.map(renderItem)}
            </div>
        );

        return (
            <div
                ref={ref}
                role="toolbar"
                aria-label="Robot controls"
                aria-orientation={orientation}
                data-orientation={orientation}
                className={`command-rail ${className}`.trim()}
                style={style}
            >
                {groups.filter((group) => group.lead).map((group) => (
                    <React.Fragment key={group.key}>
                        {renderGroup(group)}
                        <span className="rail-divider" aria-hidden />
                    </React.Fragment>
                ))}

                <div className="rail-group">
                    <span className="rail-code" aria-hidden>CONTROL</span>
                    <Tooltip placement={placement} title={arm.hint}>
                        <span className="rail-slot">
                            <button
                                type="button"
                                className={`rail-btn rail-arm${arm.isOn ? ' is-on' : ''}`}
                                aria-label="Control Robot"
                                aria-pressed={arm.isOn}
                                onClick={arm.onToggle}
                            >
                                <span className="rail-icon"><ThunderboltOutlined /></span>
                                <span className="rail-caption">ROBOT</span>
                                <span className="rail-arm-state">{arm.isOn ? 'ON' : 'OFF'}</span>
                            </button>
                        </span>
                    </Tooltip>
                </div>

                {groups.filter((group) => !group.lead).map((group) => (
                    <React.Fragment key={group.key}>
                        <span className={`rail-divider${group.pinEnd ? ' rail-divider-end' : ''}`} aria-hidden />
                        {renderGroup(group)}
                    </React.Fragment>
                ))}
            </div>
        );
    },
);

CommandRail.displayName = 'CommandRail';

export default CommandRail;
