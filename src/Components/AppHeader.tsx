/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState, useRef } from 'react';
import { Button, Tooltip, Typography, Grid } from 'antd';
import { SettingOutlined, ReadOutlined } from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { ConnectedClientsHandler } from '../Services/ros/handlers/ConnectedClients.handler';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';
import {
    STATUS_ERROR,
    STATUS_WARNING,
    fonts,
} from '../Constants/theme';
import { SettingsModal, isAutoConnectEnabled } from './SettingsModal';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export const AppHeader: React.FC = () => {
    const { connectionStatus, isConnected, connect, currentUrl } = useRosConnection();
    const [countState, setCountState] = useState<number>(0);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [activeControllerId, setActiveControllerId] = useState<string>(
        () => ControlModeHandler.getInstance().currentControllerId
    );
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
        return ControlModeHandler.getInstance().onControllerChanged(setActiveControllerId);
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;

        const checkAutoConnect = () => {
            if (isAutoConnectEnabled() && connectionStatusRef.current === 'disconnected') {
                connect(currentUrlRef.current).catch(() => { });
            }
        };

        checkAutoConnect();
        timer = setInterval(checkAutoConnect, 5000);

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

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'CONNECTED';
            case 'connecting':
                return 'CONNECTING...';
            case 'disconnected':
                return 'DISCONNECTED';
            default:
                return 'UNKNOWN';
        }
    };

    const getConnectionStatusColor = () => {
        if (countState > 1 && isConnected) {
            return STATUS_WARNING;
        }
        switch (connectionStatus) {
            case 'connected':
                return 'var(--color-highlight)';
            case 'connecting':
                return STATUS_WARNING;
            case 'disconnected':
                return STATUS_ERROR;
            default:
                return 'var(--color-text-secondary)';
        }
    };

    const getControllerColor = () => {
        if (activeControllerId === ControlModeHandler.getInstance().clientId) return 'var(--color-highlight)';
        if (activeControllerId !== '') return STATUS_WARNING;
        return 'var(--color-text-secondary)';
    };

    const bridgeColor = getConnectionStatusColor();
    const controllerColor = getControllerColor();

    const statusStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '3px 8px' : '4px 12px',
        minWidth: 0,
    };

    const dotStyle: React.CSSProperties = {
        width: 8,
        height: 8,
        borderRadius: 0, // Sharp square technical indicator
    };

    const statusIndicators = (
        <>
            <Tooltip title="Number of connected clients to the ROS Bridge.">
                <div style={statusStyle} className="header-status-box chamfer-box-sm">
                    <span
                        style={{
                            ...dotStyle,
                            backgroundColor: bridgeColor,
                        }}
                    />
                    <Text
                        style={{
                            color: bridgeColor,
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            letterSpacing: '0.5px',
                        }}
                    >
                        {isMobile ? `${countState}` : `ROS BRIDGE:${countState > 0 ? ` ${countState}` : ''} ${getConnectionStatusText()}`}
                    </Text>
                </div>
            </Tooltip>
            <Tooltip title={activeControllerId !== '' ? 'A client is currently controlling the robot.' : 'No client is currently controlling the robot.'}>
                <div style={statusStyle} className="header-status-box chamfer-box-sm">
                    <span
                        style={{
                            ...dotStyle,
                            backgroundColor: controllerColor,
                        }}
                    />
                    <Text
                        style={{
                            color: controllerColor,
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            letterSpacing: '0.5px',
                        }}
                    >
                        {activeControllerId !== '' ? 'CONTROLLED' : 'UNCONTROLLED'}
                    </Text>
                </div>
            </Tooltip>
        </>
    );

    const headerActions = (
        <>
            <Tooltip title="Documentation">
                <Button
                    className="nav-item-btn"
                    icon={isMobile ? <ReadOutlined /> : undefined}
                    onClick={() => window.open('https://docs.lucy-robotics.com/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV', '_blank')}
                >
                    {!isMobile && 'Documentation'}
                </Button>
            </Tooltip>
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
            {statusIndicators}
            {headerActions}
        </div>
    );
};

export default AppHeader;
