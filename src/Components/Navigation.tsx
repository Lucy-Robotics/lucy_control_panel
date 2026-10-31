/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space, Grid } from 'antd';
import { ControlOutlined, SettingOutlined, FundProjectionScreenOutlined } from '@ant-design/icons';
import { ROUTES } from '../Constants/routes.ts';
import { useMeasuredHeight } from '../hooks/useMeasuredHeight';

const { useBreakpoint } = Grid;

const navigationItems = [
    { to: ROUTES.control, label: 'CONTROL', icon: <ControlOutlined /> },
    { to: ROUTES.sensors, label: 'SENSORS', icon: <FundProjectionScreenOutlined /> },
    { to: ROUTES.robotConfiguration, label: 'ROBOT CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [mobileNavRef, mobileNavHeight] = useMeasuredHeight<HTMLDivElement>();

    // Lets sticky page elements (e.g. the category strip) sit above the fixed mobile nav
    useEffect(() => {
        const root = document.documentElement;
        if (isMobile && mobileNavHeight > 0) {
            root.style.setProperty('--mobile-nav-height', `${mobileNavHeight}px`);
        } else {
            root.style.removeProperty('--mobile-nav-height');
        }
    }, [isMobile, mobileNavHeight]);

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
        background: 'color-mix(in srgb, var(--color-surface-1) 92%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 8px',
        gap: 6,
    };

    if (isMobile) {
        return (
            <div ref={mobileNavRef} style={mobileStyle}>
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
