/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { RailItem } from './CommandRail.tsx';
import { CONTROL_OFF_HINT } from './ReadOnlyHint.tsx';
import { GamepadOutlined } from './GamepadIcon.tsx';

interface GamepadTeleopRailItemProps {
    isOn: boolean;
    onToggle: () => void;
    isConnected: boolean;
    isSending: boolean;
    hasEndEffector: boolean;
    otherTeleop: string | null;
}

export function gamepadDisabledReason({ isOn, isConnected, isSending, hasEndEffector, otherTeleop }: GamepadTeleopRailItemProps): string | undefined {
    if (isOn) return undefined;
    if (!isConnected) return 'Controller: plug in a game controller, then press any of its buttons';
    if (!hasEndEffector) return 'Controller: needs a robot that publishes its end effector (/lucy/end_effector)';
    if (!isSending) return CONTROL_OFF_HINT;
    if (otherTeleop) return `Turn ${otherTeleop} off to use the controller`;
    return undefined;
}

export function gamepadTeleopRailItem(props: GamepadTeleopRailItemProps): RailItem {
    const reason = gamepadDisabledReason(props);
    return {
        key: 'gamepad-teleop',
        icon: <GamepadOutlined />,
        label: props.isOn
            ? 'Controller: hold L1 to move. Esc or this button stops'
            : 'Controller: move the end effector and the claw with a game controller',
        caption: 'PAD',
        onClick: props.onToggle,
        active: props.isOn,
        disabled: reason !== undefined,
        disabledReason: reason,
    };
}
