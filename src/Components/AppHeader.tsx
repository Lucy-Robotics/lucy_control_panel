/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState, useRef } from 'react';
import { Button, Tooltip, Typography, Grid } from 'antd';
import { SettingOutlined, ReadOutlined, ExportOutlined, UserOutlined } from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { ConnectedClientsHandler } from '../Services/ros/handlers/ConnectedClients.handler';
import {
    fonts,
} from '../Constants/theme';
import { SettingsModal, isAutoConnectEnabled } from './SettingsModal';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export const AppHeader: React.FC = () => {
    const { connectionStatus, isConnected, connect, currentUrl } = useRosConnection();
    const [countState, setCountState] = useState<number>(0);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const connectionStatusRef = useRef(connectionStatus);
    const currentUrlRef = useRef(currentUrl);
    const screens = useBreakpoint();
    const isMobile = !screens.lg;

    useEffect(() => {
        connectionStatusRef.current = connectionStatus;
    }, [connectionStatus]);

    useEffect(() => {
        currentUrlRef.current = currentUrl;
    }, [currentUrl]);

    useEffect(() => {
        const handler = new ConnectedClientsHandler((count: number) => {
            setCountState(count);
        });
        return () => {
            handler.unsubscribe();
        };
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;

        const checkAutoConnect = () => {
            if (isAutoConnectEnabled() && connectionStatusRef.current === 'disconnected') {
                connect(currentUrlRef.current).catch(() => { });
            }
        };

        checkAutoConnect();
        timer = setInterval(checkAutoConnect, 1000);

        const handleAutoConnectChange = () => {
            if (isAutoConnectEnabled()) {
                checkAutoConnect();
            }
        };

        window.addEventListener('autoConnectChanged', handleAutoConnectChange);

        return () => {
            if (timer) clearInterval(timer);
            window.removeEventListener('autoConnectChanged', handleAutoConnectChange);
        };
    }, [connect]);

    const bridgeColor = countState > 1 ? 'var(--color-status-warning)' : 'var(--color-highlight)';

    const statusStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '0 8px' : '0 12px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    };

    const statusFrame = (color: string) =>
        ({ ...statusStyle, '--frame': `color-mix(in srgb, ${color} 45%, transparent)`, '--status-color': color }) as React.CSSProperties;

    const statusIndicators = isConnected && (
        <Tooltip title="Number of connected clients to the ROS Bridge.">
            <div style={statusFrame(bridgeColor)} className="header-status-box">
                <Text
                    style={{
                        color: bridgeColor,
                        fontFamily: fonts.mono,
                        fontSize: 11,
                        letterSpacing: '0.5px',
                        lineHeight: 1,
                    }}
                >
                    <UserOutlined style={{ marginRight: 4 }} />{countState}
                </Text>
            </div>
        </Tooltip>
    );

    const documentationButton = (
        <Tooltip title={<>Access our external documentation</>}>
            <Button
                className="nav-item-btn"
                icon={isMobile ? <ReadOutlined /> : undefined}
                onClick={() => window.open('https://docs.lucy-robotics.com/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV', '_blank')}
            >
                {!isMobile && <>Documentation <ExportOutlined /></>}
            </Button>
        </Tooltip>
    );

    const headerActions = (
        <>
            <Tooltip title="Settings">
                <Button
                    className="nav-item-btn"
                    icon={<SettingOutlined />}
                    onClick={() => setIsSettingsModalVisible(true)}
                />
            </Tooltip>
            <SettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
            />
        </>
    );

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
                gap: isMobile ? 8 : 12,
            }}
        >
            {documentationButton}
            {statusIndicators}
            {headerActions}
        </div>
    );
};

export default AppHeader;
