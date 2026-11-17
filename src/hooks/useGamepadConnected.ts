/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

export const firstGamepad = (): Gamepad | null =>
    (typeof navigator === 'undefined' || !navigator.getGamepads ? [] : [...navigator.getGamepads()]).find(
        (pad): pad is Gamepad => pad !== null && pad.connected,
    ) ?? null;

export function useGamepadConnected(): boolean {
    const [connected, setConnected] = useState(() => firstGamepad() !== null);

    useEffect(() => {
        const update = () => setConnected(firstGamepad() !== null);
        window.addEventListener('gamepadconnected', update);
        window.addEventListener('gamepaddisconnected', update);
        return () => {
            window.removeEventListener('gamepadconnected', update);
            window.removeEventListener('gamepaddisconnected', update);
        };
    }, []);

    return connected;
}
