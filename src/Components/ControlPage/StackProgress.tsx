/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Progress, Steps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { LucyLoader } from '../LucyLoader.tsx';
import { robotLabel } from '../../Utils/robotPackages.ts';
import { panelProgress } from '../../Utils/stackStatus.ts';
import type { StackStatus } from '../../Utils/stackStatus.ts';
import { UI_ACCENT_GREEN } from '../../Constants/uiTheme.ts';

interface StackProgressProps {
    robot: string | null;
    status: StackStatus | null;
    isConnected: boolean;
    connectButton: boolean;
}

export function StackProgress({ robot, status, isConnected, connectButton }: StackProgressProps) {
    const stage = status?.status === 'loading' && status.index > 0 ? status : null;
    const { titles, current, percent, counter } = panelProgress(stage, isConnected);
    const robotName = status?.robot ?? robot;

    return (
        <LucyLoader
            title="LUCY IS STARTING…"
            label={robotName ? `ROBOT: ${robotLabel(robotName).toUpperCase()}` : undefined}
            detail={stage ? `${counter} ${stage.label}` : isConnected ? status?.label : connectButton ? 'Waiting for the ROS bridge' : 'Connecting to the ROS bridge'}
            connectButton={connectButton}
        >
            <div style={{ width: 'min(420px, 100%)', marginTop: 24 }}>
                <Progress className="lucy-progress" percent={percent} status="active" strokeColor={UI_ACCENT_GREEN} />
                <Steps
                    direction="vertical"
                    size="small"
                    current={current}
                    status="process"
                    items={titles.map((title, i) => ({
                        title,
                        icon: i === current ? <LoadingOutlined style={{ color: UI_ACCENT_GREEN }} /> : undefined,
                    }))}
                    style={{ marginTop: 16 }}
                />
            </div>
        </LucyLoader>
    );
}
