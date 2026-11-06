/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space, Grid, Tooltip } from 'antd';
import { ControlOutlined, SettingOutlined, FundProjectionScreenOutlined } from '@ant-design/icons';
import { ROUTES } from '../Constants/routes.ts';

const { useBreakpoint } = Grid;

const navigationItems = [
    { to: ROUTES.control, label: 'CONTROL', icon: <ControlOutlined /> },
    { to: ROUTES.sensors, label: 'SENSORS', icon: <FundProjectionScreenOutlined /> },
    { to: ROUTES.robotConfiguration, label: 'ROBOT CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();
    const screens = useBreakpoint();

    if (!screens.md) return null;

    // Below xl the labels don't fit in the header next to the title and actions.
    const compact = !screens.xl;

    return (
        <nav style={{ display: 'flex', justifyContent: 'center', gridColumn: 2 }}>
            <Space size={8}>
                {navigationItems.map(item => {
                    const isActive = location.pathname === item.to;
                    return (
                        <Tooltip title={compact ? item.label : undefined} key={item.to}>
                            <Link to={item.to} aria-label={item.label}>
                                <Button
                                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                                    icon={item.icon}
                                >
                                    {!compact && item.label}
                                </Button>
                            </Link>
                        </Tooltip>
                    );
                })}
            </Space>
        </nav>
    );
};

export default Navigation;
