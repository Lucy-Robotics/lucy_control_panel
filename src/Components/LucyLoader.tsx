/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Button, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook.ts';
import {
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    fonts,
} from '../Constants/theme.ts';
import './LucyLoader.css';

const { Text } = Typography;

export interface LucyLoaderProps {
    /** Big title shown under the spinner (defaults to "LUCY"). */
    title?: string;
    /** Status line below the title (e.g. "Connecting to ROS bridge"). */
    label?: string;
    /** Display a connect button bellow the messages */
    connectButton?: boolean;
    /** Optional supporting message, shown smaller below the label. */
    detail?: string;
    /** Compact = no full-viewport min-height (use inside cards). */
    compact?: boolean;
    /** Show the spinner animation. */
    showSpinner?: boolean;
}

/**
 * Used in place of static "Connect to ROS" messages while a page is waiting on
 * the ROS bridge or the active hardware config.
 */
export const LucyLoader: React.FC<LucyLoaderProps> = ({
    title = 'LUCY',
    label,
    connectButton,
    detail,
    compact = false,
    showSpinner = true,
}) => {
    const { connect, currentUrl, connectionStatus } = useRosConnection();

    return (
        <div className={`lucy-loader${compact ? ' lucy-loader-compact' : ''}`}>
            {showSpinner && <div className="lucy-loader-spinner" />}
            <div className="lucy-loader-text">
                <Text
                    style={{
                        color: TEXT_PRIMARY,
                        fontFamily: fonts.graphical,
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: 6,
                    }}
                >
                    {title}
                </Text>
                {label ? (
                    <Text
                        style={{
                            color: 'var(--color-highlight)',
                            fontFamily: fonts.mono,
                            fontSize: 13,
                            fontWeight: 'bold',
                            letterSpacing: 2,
                            marginTop: 8,
                        }}
                    >
                        {`> ${label}`}
                    </Text>
                ) : null}
                {detail ? (
                    <Text
                        style={{
                            color: TEXT_SECONDARY,
                            fontFamily: fonts.mono,
                            fontSize: 12,
                            marginTop: 8,
                            maxWidth: 420,
                            textAlign: 'center',
                            lineHeight: 1.5,
                        }}
                    >
                        {detail}
                    </Text>
                ) : null}
                {connectButton && (
                    <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => connect(currentUrl)}
                        loading={connectionStatus === 'connecting'}
                        style={{
                            marginTop: 24,
                            backgroundColor: 'var(--color-highlight)',
                            borderColor: 'var(--color-highlight)',
                            color: 'var(--color-text-on-highlight)',
                            fontWeight: 'bold',
                            borderRadius: 0,
                            boxShadow: 'none',
                        }}
                    >
                        CONNECT
                    </Button>
                )}
            </div>
        </div>
    );
};

export default LucyLoader;
