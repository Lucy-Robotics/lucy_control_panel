/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ghostOpacity';
export const DEFAULT_GHOST_OPACITY = 0.15;

export function parseGhostOpacity(stored: string | null): number {
    const value = stored === null ? NaN : Number(stored);
    return value >= 0 && value <= 1 ? value : DEFAULT_GHOST_OPACITY;
}

function readOpacity(): number {
    try {
        return parseGhostOpacity(localStorage.getItem(STORAGE_KEY));
    } catch {
        return DEFAULT_GHOST_OPACITY;
    }
}

const listeners = new Set<() => void>();
let opacity = readOpacity();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

function writeOpacity(next: number): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, String(next));
        return true;
    } catch {
        return false;
    }
}

export function setGhostOpacity(next: number): void {
    opacity = next;
    writeOpacity(next);
    listeners.forEach((listener) => listener());
}

export const useGhostOpacity = (): number => useSyncExternalStore(subscribe, () => opacity);
