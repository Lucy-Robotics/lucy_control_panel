/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Space, Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { MovableModal } from '../MovableModal.tsx';
import { robotLabel } from '../../Utils/robotPackages.ts';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../../Constants/uiTheme.ts';

const { Text } = Typography;

interface RobotSwitchConfirmModalProps {
    robotPackage: string | null;
    onConfirm: (robotPackage: string) => void;
    onCancel: () => void;
}

export function RobotSwitchConfirmModal({ robotPackage, onConfirm, onCancel }: RobotSwitchConfirmModalProps) {
    const name = robotLabel(robotPackage ?? '');

    return (
        <MovableModal
            modalName={`SWITCH TO ${name.toUpperCase()}?`}
            isVisible={robotPackage !== null}
            onClose={onCancel}
            centered
            initialSize={{ w: 480, h: 260 }}
            header={<RobotOutlined style={{ color: UI_WARNING }} />}
            footer={[
                <Button
                    key="switch"
                    type="primary"
                    icon={<RobotOutlined />}
                    onClick={() => robotPackage && onConfirm(robotPackage)}
                    style={{ backgroundColor: UI_ACCENT_GREEN, borderColor: UI_ACCENT_GREEN, color: UI_TEXT_ON_ACCENT }}
                >
                    Switch to {name}
                </Button>,
                <Button
                    key="cancel"
                    onClick={onCancel}
                    style={{ backgroundColor: UI_COLOR_TRANSPARENT, borderColor: UI_BORDER_SOFT, color: UI_TEXT_PRIMARY_ON_DARK }}
                >
                    Cancel
                </Button>,
            ]}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Switch to {name}? Lucy restarts on this robot.</Text>
                <Text style={{ color: UI_TEXT_SUBTLE }}>
                    Every connected client loses the robot until Lucy is ready again.
                </Text>
            </Space>
        </MovableModal>
    );
}
