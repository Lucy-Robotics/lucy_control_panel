/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { JoystickOutlined } from './JoystickIcon';

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
    code: string;
    items: RailItem[];
    pinEnd?: boolean;
}

export interface ControlArm {
    isOn: boolean;
    onToggle: () => void;
    hint: string;
}

interface CommandRailProps {
    groups: RailGroup[];
    /** CONTROL toggle; left out when it is shown elsewhere (over the docked 3D view). */
    arm?: ControlArm;
    orientation: 'vertical' | 'horizontal';
    className?: string;
    style?: React.CSSProperties;
}

export const CommandRail = React.forwardRef<HTMLDivElement, CommandRailProps>(
    ({ groups, arm, orientation, className = '', style }, ref) => {
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
                {arm && (
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
                                    <span className="rail-icon"><JoystickOutlined /></span>
                                    <span className="rail-caption">CONTROL</span>
                                    <span className="rail-arm-state">{arm.isOn ? 'ON' : 'OFF'}</span>
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                )}

                {groups.map((group, index) => (
                    <React.Fragment key={group.key}>
                        {(arm || index > 0) && (
                            <span className={`rail-divider${group.pinEnd ? ' rail-divider-end' : ''}`} aria-hidden />
                        )}
                        <div className="rail-group" role="group" aria-label={group.code}>
                            <span className="rail-code" aria-hidden>{group.code}</span>
                            {group.items.map(renderItem)}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    },
);

CommandRail.displayName = 'CommandRail';

export default CommandRail;
