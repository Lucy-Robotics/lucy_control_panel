/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from 'react';
import {
    ArrowDownOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    ArrowUpOutlined,
    VerticalAlignBottomOutlined,
    VerticalAlignTopOutlined,
} from '@ant-design/icons';

const BUTTONS: ReadonlyArray<{ code: string; label: string; area: string; icon: ReactNode }> = [
    { code: 'KeyW', label: 'Forward (W)', area: 'forward', icon: <ArrowUpOutlined /> },
    { code: 'KeyA', label: 'Left (A)', area: 'left', icon: <ArrowLeftOutlined /> },
    { code: 'KeyD', label: 'Right (D)', area: 'right', icon: <ArrowRightOutlined /> },
    { code: 'KeyS', label: 'Back (S)', area: 'back', icon: <ArrowDownOutlined /> },
    { code: 'Space', label: 'Up (Space)', area: 'up', icon: <VerticalAlignTopOutlined /> },
    { code: 'ShiftLeft', label: 'Down (Shift)', area: 'down', icon: <VerticalAlignBottomOutlined /> },
];

const CLEAR_OF_NAV_AND_VIEW_CUBE = { right: 176, bottom: 80 };
const MOBILE_GAP_PX = 16;

interface JogPadProps {
    onPress: (code: string) => void;
    onRelease: (code: string) => void;
    mobileRailHeight: number | null;
}

export function JogPad({ onPress, onRelease, mobileRailHeight }: JogPadProps) {
    const position = mobileRailHeight === null
        ? CLEAR_OF_NAV_AND_VIEW_CUBE
        : { right: MOBILE_GAP_PX, bottom: mobileRailHeight + MOBILE_GAP_PX };
    return (
        <div className="jog-pad" role="group" aria-label="Move the end effector" style={position}>
            {BUTTONS.map(({ code, label, area, icon }) => (
                <button
                    key={code}
                    type="button"
                    className="rail-btn jog-btn"
                    style={{ gridArea: area }}
                    aria-label={label}
                    title={label}
                    onPointerDown={() => onPress(code)}
                    onPointerUp={() => onRelease(code)}
                    onPointerCancel={() => onRelease(code)}
                    onPointerLeave={() => onRelease(code)}
                    onContextMenu={(event) => event.preventDefault()}
                >
                    {icon}
                </button>
            ))}
        </div>
    );
}
