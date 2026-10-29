/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

/** Outer width of the vertical rail: 60px buttons + 6px padding + 1px frame, each side. */
export const COMMAND_RAIL_WIDTH = 74;

export interface RailItem {
    key: string;
    icon: ReactNode;
    /** Tooltip title and accessible name. */
    label: string;
    /** Short caption printed under the icon (e.g. "RESET"). */
    caption: string;
    /** Optional current value printed under the caption (e.g. the docked panel). */
    detail?: string;
    onClick?: () => void;
    /** Toggle state: rendered as aria-pressed with a highlight. Omit for plain actions. */
    active?: boolean;
    disabled?: boolean;
    /** Shown in the tooltip instead of the label while disabled. */
    disabledReason?: string;
    danger?: boolean;
    /** Opens a menu instead of firing onClick (e.g. the dock selector). */
    menu?: MenuProps;
}

export interface RailGroup {
    key: string;
    /** Short mono caption shown above the group (e.g. "POSE"). */
    code: string;
    items: RailItem[];
    /** Pushes the group to the far end of the rail (bottom when vertical). */
    pinEnd?: boolean;
}

interface CommandRailProps {
    groups: RailGroup[];
    arm: {
        isOn: boolean;
        onToggle: () => void;
        hint: string;
    };
    orientation: 'vertical' | 'horizontal';
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Icon toolbar for the control page, grouped by function.
 *
 * Every button sits in a span so its tooltip still shows while the button is
 * disabled (disabled buttons never receive pointer events).
 */
export const CommandRail = React.forwardRef<HTMLDivElement, CommandRailProps>(
    ({ groups, arm, orientation, className = '', style }, ref) => {
        const placement = orientation === 'vertical' ? 'right' : 'bottom';

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
                            <Dropdown menu={item.menu} trigger={['click']} placement={orientation === 'vertical' ? 'topLeft' : 'bottomLeft'}>
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

                {groups.map((group) => (
                    <React.Fragment key={group.key}>
                        <span className={`rail-divider${group.pinEnd ? ' rail-divider-end' : ''}`} aria-hidden />
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
