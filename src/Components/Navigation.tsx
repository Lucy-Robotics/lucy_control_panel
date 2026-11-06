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

const BOTTOM_OFFSET = 20;
/**
 * How far up from the viewport's bottom the bar reaches, for pages that must keep content clear
 * of it: `calc(... - var(--lucy-navigation-clearance, 0px))`.
 */
export const NAVIGATION_CLEARANCE_VAR = '--lucy-navigation-clearance';

const navigationItems = [
    { to: ROUTES.control, label: 'CONTROL', icon: <ControlOutlined /> },
    { to: ROUTES.sensors, label: 'SENSORS', icon: <FundProjectionScreenOutlined /> },
    { to: ROUTES.robotConfiguration, label: 'ROBOT CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();
    const screens = useBreakpoint();
    const [barRef, barHeight] = useMeasuredHeight<HTMLDivElement>();
    const shown = Boolean(screens.md);

    useEffect(() => {
        const root = document.documentElement;
        if (shown && barHeight > 0) {
            root.style.setProperty(NAVIGATION_CLEARANCE_VAR, `${barHeight + BOTTOM_OFFSET}px`);
        } else {
            root.style.removeProperty(NAVIGATION_CLEARANCE_VAR);
        }
        return () => { root.style.removeProperty(NAVIGATION_CLEARANCE_VAR); };
    }, [shown, barHeight]);

    if (!shown) return null;

    const desktopStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: BOTTOM_OFFSET,
        right: 30, // Aligned with 30px screen border
        zIndex: 1000,
        padding: '8px 12px',
    };

    return (
        <div ref={barRef} style={desktopStyle} className="lucy-navigation-bar chamfer-box-lg">
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
