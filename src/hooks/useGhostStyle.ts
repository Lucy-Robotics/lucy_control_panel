/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ghostStyle';
export const GHOST_STYLES = ['outline', 'plain'] as const;
export type GhostStyle = typeof GHOST_STYLES[number];

export function parseGhostStyle(stored: string | null): GhostStyle {
    return GHOST_STYLES.find((style) => style === stored) ?? 'outline';
}

function readStyle(): GhostStyle {
    try {
        return parseGhostStyle(localStorage.getItem(STORAGE_KEY));
    } catch {
        return 'outline';
    }
}

const listeners = new Set<() => void>();
let current = readStyle();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function setGhostStyle(next: GhostStyle): void {
    current = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // Private mode: the choice lasts until reload.
    }
    listeners.forEach((listener) => listener());
}

export const useGhostStyle = (): GhostStyle => useSyncExternalStore(subscribe, () => current);
