/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import yaml from 'js-yaml';

/** Drop derived `virtual_pin` — assigned at validate/generate from board list order. */
function stripDerivedVirtualPins(doc: Record<string, unknown>): Record<string, unknown> {
    const next = structuredClone(doc);
    for (const key of ['actuators', 'sensors'] as const) {
        const rows = next[key];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
            if (row && typeof row === 'object' && !Array.isArray(row)) {
                delete (row as Record<string, unknown>).virtual_pin;
            }
        }
    }
    return next;
}

export function parseHardwareConfigYaml(text: string): Record<string, unknown> {
    const loaded = yaml.load(text);
    if (loaded == null || typeof loaded !== 'object' || Array.isArray(loaded)) {
        throw new Error('Hardware YAML must parse to a mapping at the root.');
    }
    return stripDerivedVirtualPins(loaded as Record<string, unknown>);
}

export function stringifyHardwareConfigYaml(doc: Record<string, unknown>): string {
    return yaml.dump(stripDerivedVirtualPins(doc), {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
    });
}
