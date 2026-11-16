/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface PadInput {
    enable: boolean;
    right: number;
    forward: number;
    up: boolean;
    down: boolean;
    pitch: number;
    roll: number;
    squeeze: number;
    slow: number;
    nudge: { forward: number; right: number };
    open: boolean;
    close: boolean;
    fine: boolean;
}

interface Layout {
    buttons: { l1: number; r1: number; triangle: number; cross: number; circle: number; square: number };
    rightX: (pad: Gamepad) => number;
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
    buttons: { l1: 4, r1: 5, triangle: 3, cross: 0, circle: 1, square: 2 },
    rightX: (pad) => axis(pad, 2),
    rightY: (pad) => axis(pad, 3),
    l2: (pad) => buttonValue(pad, 6),
    r2: (pad) => buttonValue(pad, 7),
    dpad: (pad) => ({ forward: sign(pressed(pad, 12), pressed(pad, 13)), right: sign(pressed(pad, 15), pressed(pad, 14)) }),
};

const FIREFOX_REVOLUTION_PRO: Layout = {
    buttons: { l1: 2, r1: 18, triangle: 3, cross: 1, circle: 17, square: 0 },
    rightX: (pad) => buttonValue(pad, 6) * 2 - 1,
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
    const { buttons } = layout;
    return {
        enable: pressed(pad, buttons.l1),
        right: axis(pad, 0),
        forward: -axis(pad, 1),
        up: pressed(pad, buttons.triangle),
        down: pressed(pad, buttons.square),
        pitch: -layout.rightY(pad),
        roll: -layout.rightX(pad),
        squeeze: unit(layout.r2(pad)),
        slow: unit(layout.l2(pad)),
        nudge: layout.dpad(pad),
        open: pressed(pad, buttons.cross),
        close: pressed(pad, buttons.circle),
        fine: pressed(pad, buttons.r1),
    };
}
