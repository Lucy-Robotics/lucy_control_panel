/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space, Grid } from 'antd';
import { ControlOutlined, SettingOutlined, FundProjectionScreenOutlined, ApartmentOutlined } from '@ant-design/icons';
import { ROUTES } from '../Constants/routes.ts';
import {
    SECONDARY_COLOR,
} from '../Constants/theme.ts';

const { useBreakpoint } = Grid;

const navigationItems = [
    { to: ROUTES.control, label: 'CONTROL', icon: <ControlOutlined /> },
    { to: ROUTES.automation, label: 'AUTOMATION', icon: <ApartmentOutlined /> },
    { to: ROUTES.sensors, label: 'SENSORS', icon: <FundProjectionScreenOutlined /> },
    { to: ROUTES.robotConfiguration, label: 'ROBOT CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const desktopStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 20,
        right: 30, // Aligned with 30px screen border
        zIndex: 1000,
        padding: '8px 12px',
    };

    const mobileStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: `rgba(20, 20, 20, 0.98)`,
        borderTop: `1px solid ${SECONDARY_COLOR}`,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 8px',
        gap: 6,
    };

    if (isMobile) {
        return (
            <div style={mobileStyle}>
                {navigationItems.map(item => {
                    const isActive = location.pathname === item.to;
                    return (
                        <Link to={item.to} key={item.to} style={{ flex: 1, textAlign: 'center' }}>
                            <Button
                                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                                icon={item.icon}
                                style={{ width: '100%' }}
                            >
                                {screens.sm && item.label}
                            </Button>
                        </Link>
                    );
                })}
            </div>
        );
    }

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
