/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const CLEAR_OF_NAV_AND_VIEW_CUBE = { right: 176, bottom: 80 };
const MOBILE_GAP_PX = 16;

interface GamepadLegendProps {
    isHeld: boolean;
    isFine: boolean;
    mobileRailHeight: number | null;
}

export function GamepadLegend({ isHeld, isFine, mobileRailHeight }: GamepadLegendProps) {
    const position = mobileRailHeight === null
        ? CLEAR_OF_NAV_AND_VIEW_CUBE
        : { right: MOBILE_GAP_PX, bottom: mobileRailHeight + MOBILE_GAP_PX };
    const rows: Array<[string, string]> = [
        ['Left stick', 'move in X Y'],
        ['Right stick ↕', 'up and down'],
        ['Right stick ↔', 'pitch'],
        ['□ / ○', 'roll'],
        ['R2', 'grip'],
        ['△ / ×', 'open / close'],
        ['L2', 'slower'],
        ['R1', isFine ? 'fine mode off' : 'fine mode'],
    ];
    return (
        <aside className="gamepad-legend chamfer-box" aria-label="Controller" style={position}>
            <div className={`gamepad-legend-status${isHeld ? ' is-held' : ''}`} role="status">
                {isHeld ? 'Moving' : 'Hold L1 to move'}
                {isFine && <span className="gamepad-legend-fine">FINE</span>}
            </div>
            <dl>
                {rows.map(([control, action]) => (
                    <div key={control}>
                        <dt>{control}</dt>
                        <dd>{action}</dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}
