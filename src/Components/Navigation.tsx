/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space, Grid } from 'antd';
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

    // No navbar on phones: the bottom edge belongs to the page's own toolbar
    if (!screens.md) return null;

    const desktopStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 20,
        right: 30, // Aligned with 30px screen border
        zIndex: 1000,
        padding: '8px 12px',
    };

    return (
        <div style={desktopStyle} className="lucy-navigation-bar chamfer-box-lg">
            <Space size={8}>
                {navigationItems.map(item => {
                    const isActive = location.pathname === item.to;
                    return (
                        <Link to={item.to} key={item.to}>
                            <Button
                                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                                icon={item.icon}
                            >
                                {item.label}
                            </Button>
                        </Link>
                    );
                })}
            </Space>
        </div>
    );
};

export default Navigation;
