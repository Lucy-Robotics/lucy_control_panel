/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Alert } from 'antd';
import { useRosConnection } from '../hooks/useRosConnection.hook';

interface RosConnectionAlertProps {
    message: string;
}

export const RosConnectionAlert: React.FC<RosConnectionAlertProps> = ({ message }) => {
    const { isConnected, isConnecting } = useRosConnection();

    if (isConnected) return null;

    return (
        <Alert
            type="warning"
            showIcon
            message={isConnecting ? 'Connecting to the ROS bridge...' : message}
            style={{ marginBottom: 16 }}
        />
    );
};
