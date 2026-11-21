/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const POINTER_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'wheel'] as const;

export const RenderOnChange: React.FC = () => {
    const invalidate = useThree((state) => state.invalidate);
    const canvas = useThree((state) => state.gl.domElement);

    useEffect(() => invalidate());

    useEffect(() => {
        const redraw = () => invalidate();
        POINTER_EVENTS.forEach((type) => canvas.addEventListener(type, redraw));
        return () => POINTER_EVENTS.forEach((type) => canvas.removeEventListener(type, redraw));
    }, [canvas, invalidate]);

    return null;
};
