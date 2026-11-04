/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Alert, Button, Progress, Steps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { LucyLoader } from '../LucyLoader.tsx';
import { robotLabel } from '../../Utils/robotPackages.ts';
import { panelProgress } from '../../Utils/stackStatus.ts';
import type { StackStatus } from '../../Utils/stackStatus.ts';
import { UI_ACCENT_GREEN, UI_BORDER_SOFT, UI_COLOR_TRANSPARENT, UI_TEXT_PRIMARY_ON_DARK } from '../../Constants/uiTheme.ts';

interface StackProgressProps {
    target: string | null;
    robot: string | null;
    status: StackStatus | null;
    isConnected: boolean;
    timedOut: boolean;
    connectButton: boolean;
    onDismiss: () => void;
}

const failureOf = (status: StackStatus | null, timedOut: boolean): string | null => {
    if (status?.status === 'crashed') return `Lucy crashed (${status.label}). Check the Lucy TUI.`;
    if (timedOut) return 'Lucy is still not ready after 3 minutes. Check the Lucy TUI.';
    return null;
};

export function StackProgress({ target, robot, status, isConnected, timedOut, connectButton, onDismiss }: StackProgressProps) {
    const stage = status?.status === 'loading' && status.index > 0 && (!target || status.robot === target) ? status : null;
    const failure = failureOf(status, timedOut);
    const { titles, current, percent, counter } = panelProgress(stage, isConnected);
    const robotName = target ?? status?.robot ?? robot;

    return (
        <LucyLoader
            title="LUCY IS STARTING…"
            label={robotName ? `ROBOT: ${robotLabel(robotName).toUpperCase()}` : undefined}
            detail={stage ? `${counter} ${stage.label}` : isConnected ? status?.label : connectButton ? 'Waiting for the ROS bridge' : 'Connecting to the ROS bridge'}
            showSpinner={!failure}
            connectButton={connectButton && !failure}
        >
            <div style={{ width: 'min(420px, 100%)', marginTop: 24 }}>
                <Progress
                    className="lucy-progress"
                    percent={percent}
                    status={failure ? 'exception' : 'active'}
                    strokeColor={UI_ACCENT_GREEN}
                />
                <Steps
                    direction="vertical"
                    size="small"
                    current={current}
                    status={failure ? 'error' : 'process'}
                    items={titles.map((title, i) => ({
                        title,
                        icon: i === current && !failure ? <LoadingOutlined style={{ color: UI_ACCENT_GREEN }} /> : undefined,
                    }))}
                    style={{ marginTop: 16 }}
                />
                {failure && (
                    <Alert
                        type="error"
                        showIcon
                        message={failure}
                        action={
                            <Button
                                size="small"
                                onClick={onDismiss}
                                style={{
                                    backgroundColor: UI_COLOR_TRANSPARENT,
                                    borderColor: UI_BORDER_SOFT,
                                    color: UI_TEXT_PRIMARY_ON_DARK,
                                }}
                            >
                                Dismiss
                            </Button>
                        }
                    />
                )}
            </div>
        </LucyLoader>
    );
}
