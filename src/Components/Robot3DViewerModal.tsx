/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FloatingViewerModal } from './FloatingViewerModal.tsx';
import Robot3DViewer from '../Pages/Robot3DViewer.tsx';
import type { JointControlState } from '../Constants/robotTypes';
import type { Vec3 } from '../Utils/phoneMotion';

interface Robot3DViewerModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    isControlOn?: boolean;
    joints?: JointControlState[];
    onJointValueChange?: (name: string, value: number) => void;
    teleopTarget?: Vec3 | null;
}

export function Robot3DViewerModal({
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 400, h: 800 },
    isControlOn,
    joints,
    onJointValueChange,
    teleopTarget,
}: Robot3DViewerModalProps) {
    return (
        <FloatingViewerModal
            modalName="3D VIEW"
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
        >
            <Robot3DViewer
                isControlOn={isControlOn}
                joints={joints}
                onJointValueChange={onJointValueChange}
                teleopTarget={teleopTarget}
            />
        </FloatingViewerModal>
    );
}
