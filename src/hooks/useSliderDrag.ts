/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext, useContext, useSyncExternalStore } from 'react';

const RELEASE_HOLD_MS = 1000;

export interface SliderDrag {
    name: string;
    value: number;
}

export interface SliderDragStore {
    get: () => SliderDrag | null;
    move: (name: string, value: number) => void;
    release: () => void;
    subscribe: (listener: () => void) => () => void;
}

export function createSliderDragStore(): SliderDragStore {
    let drag: SliderDrag | null = null;
    let releaseTimer: number | undefined;
    const listeners = new Set<() => void>();
    const publish = (next: SliderDrag | null) => {
        drag = next;
        listeners.forEach(listener => listener());
    };

    return {
        get: () => drag,
        move: (name, value) => {
            window.clearTimeout(releaseTimer);
            publish({ name, value });
        },
        release: () => {
            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(() => publish(null), RELEASE_HOLD_MS);
        },
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const SliderDragContext = createContext<SliderDragStore | null>(null);

const noopSubscribe = () => () => {};
const noDrag = () => null;

export function useSliderDrag(): SliderDrag | null {
    const store = useContext(SliderDragContext);
    return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.get ?? noDrag);
}
