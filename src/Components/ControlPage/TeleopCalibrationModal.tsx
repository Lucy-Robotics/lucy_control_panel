/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Progress, Space, Typography } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { MovableModal } from '../MovableModal.tsx';
import type { MotionCalibration } from '../../hooks/useMotionCalibration.ts';
import { CALIBRATION_S } from '../../Utils/phoneMotion.ts';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../../Constants/uiTheme.ts';

const { Text } = Typography;

export function TeleopCalibrationModal({ calibration }: { calibration: MotionCalibration }) {
    const secondsLeft = Math.ceil(CALIBRATION_S * (1 - calibration.progress));

    return (
        <MovableModal
            modalName="CALIBRATING TELEOP"
            isVisible={calibration.isCalibrating}
            onClose={calibration.cancel}
            centered
            initialSize={{ w: 420, h: 280 }}
            header={<MobileOutlined style={{ color: UI_ACCENT_GREEN }} />}
            footer={[
                <Button
                    key="cancel"
                    onClick={calibration.cancel}
                    style={{ backgroundColor: UI_COLOR_TRANSPARENT, borderColor: UI_BORDER_SOFT, color: UI_TEXT_PRIMARY_ON_DARK }}
                >
                    Cancel
                </Button>,
            ]}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                    Lay your phone flat on the table and don't touch it for {CALIBRATION_S} seconds.
                </Text>
                <Progress
                    className="lucy-progress"
                    percent={Math.round(calibration.progress * 100)}
                    format={() => `${secondsLeft} s`}
                    strokeColor={UI_ACCENT_GREEN}
                />
                {calibration.wasMoved && (
                    <Text style={{ color: UI_WARNING }}>The phone moved, starting over.</Text>
                )}
                <Text style={{ color: UI_TEXT_SUBTLE }}>Teleop starts as soon as the sensors are measured.</Text>
            </Space>
        </MovableModal>
    );
}
