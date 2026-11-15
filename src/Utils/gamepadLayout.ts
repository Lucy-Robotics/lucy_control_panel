/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface PadInput {
    enable: boolean;
    swing: number;
    reach: number;
    lift: number;
    squeeze: number;
    slow: number;
    nudge: { forward: number; right: number };
    open: boolean;
    close: boolean;
    fine: boolean;
}

interface Layout {
    buttons: { l1: number; triangle: number; circle: number; square: number };
    rightY: (pad: Gamepad) => number;
    l2: (pad: Gamepad) => number;
    r2: (pad: Gamepad) => number;
    dpad: (pad: Gamepad) => { forward: number; right: number };
}

const pressed = (pad: Gamepad, index: number) => pad.buttons[index]?.pressed ?? false;
const axis = (pad: Gamepad, index: number) => pad.axes[index] ?? 0;
const buttonValue = (pad: Gamepad, index: number) => pad.buttons[index]?.value ?? 0;
const sign = (high: boolean, low: boolean) => Number(high) - Number(low);
const NO_DPAD = { forward: 0, right: 0 };
const untouchedAsReleased = (value: number) => (value === 0 ? 0 : (value + 1) / 2);

const STANDARD: Layout = {
    buttons: { l1: 4, triangle: 3, circle: 1, square: 2 },
    rightY: (pad) => axis(pad, 3),
    l2: (pad) => buttonValue(pad, 6),
    r2: (pad) => buttonValue(pad, 7),
    dpad: (pad) => ({ forward: sign(pressed(pad, 12), pressed(pad, 13)), right: sign(pressed(pad, 15), pressed(pad, 14)) }),
};

const FIREFOX_REVOLUTION_PRO: Layout = {
    buttons: { l1: 2, triangle: 3, circle: 17, square: 0 },
    rightY: (pad) => buttonValue(pad, 7) * 2 - 1,
    l2: (pad) => untouchedAsReleased(axis(pad, 2)),
    r2: (pad) => untouchedAsReleased(axis(pad, 3)),
    dpad: () => NO_DPAD,
};

export const layoutOf = (pad: Pick<Gamepad, 'id'>): Layout =>
    pad.id.startsWith('146b-0d01-') ? FIREFOX_REVOLUTION_PRO : STANDARD;

const unit = (value: number) => Math.min(Math.max(value, 0), 1);

export function readPad(pad: Gamepad): PadInput {
    const layout = layoutOf(pad);
    return {
        enable: pressed(pad, layout.buttons.l1),
        swing: axis(pad, 0),
        reach: -axis(pad, 1),
        lift: -layout.rightY(pad),
        squeeze: unit(layout.r2(pad)),
        slow: unit(layout.l2(pad)),
        nudge: layout.dpad(pad),
        open: pressed(pad, layout.buttons.triangle),
        close: pressed(pad, layout.buttons.circle),
        fine: pressed(pad, layout.buttons.square),
    };
}
