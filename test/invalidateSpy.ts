/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './r3f-harness.ts';
import React from 'react';
import { useStore } from '@react-three/fiber';

export function createInvalidateSpy() {
    const spy = { calls: 0, canvas: null as EventTarget | null };
    const Probe: React.FC = () => {
        const store = useStore();
        React.useMemo(() => {
            store.setState({ invalidate: () => { spy.calls++; } });
            spy.canvas = store.getState().gl.domElement;
        }, [store]);
        return null;
    };
    return { spy, probe: React.createElement(Probe) };
}

export const scene = (...children: React.ReactNode[]) => React.createElement(React.Fragment, null, ...children);
