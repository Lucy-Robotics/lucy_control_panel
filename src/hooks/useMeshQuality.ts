/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';
import { MESH_QUALITIES, type MeshQuality } from '../Constants/meshQuality';
import { isSoftwareRenderer, webglRenderer } from '../Utils/softwareRenderer';

export type MeshQualitySetting = 'auto' | MeshQuality;

const STORAGE_KEY = 'meshQuality';

export function parseMeshQualitySetting(stored: string | null): MeshQualitySetting {
    return (MESH_QUALITIES as string[]).includes(stored ?? '') ? stored as MeshQuality : 'auto';
}

export function resolveMeshQuality(setting: MeshQualitySetting, renderer: string | null): MeshQuality {
    if (setting !== 'auto') return setting;
    return isSoftwareRenderer(renderer) ? 'light' : 'full';
}

function readSetting(): MeshQualitySetting {
    try {
        return parseMeshQualitySetting(localStorage.getItem(STORAGE_KEY));
    } catch {
        return 'auto';
    }
}

const listeners = new Set<() => void>();
let setting = readSetting();
let autoQuality: MeshQuality | null = null;

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function setMeshQualitySetting(next: MeshQualitySetting): void {
    setting = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // the choice still applies to this tab
    }
    listeners.forEach((listener) => listener());
}

export function autoMeshQuality(): MeshQuality {
    autoQuality ??= resolveMeshQuality('auto', webglRenderer());
    return autoQuality;
}

const currentSetting = () => setting;

export const useMeshQualitySetting = (): MeshQualitySetting => useSyncExternalStore(subscribe, currentSetting, currentSetting);

export const useMeshQuality = (): MeshQuality => {
    const current = useMeshQualitySetting();
    return current === 'auto' ? autoMeshQuality() : current;
};
