/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import yaml from 'js-yaml';

export type MotorSpecs = Record<string, Record<string, unknown>>;

export function parseMotorSpecs(text: string | undefined): MotorSpecs {
    const loaded = text ? yaml.load(text) : null;
    return loaded && typeof loaded === 'object' && !Array.isArray(loaded) ? loaded as MotorSpecs : {};
}

export function motorValuesByJoint(
    doc: Record<string, unknown> | null,
    specs: MotorSpecs,
    key: string,
): ReadonlyMap<string, number> {
    const actuators = Array.isArray(doc?.actuators) ? doc.actuators as Record<string, unknown>[] : [];
    const values = new Map<string, number>();
    for (const actuator of actuators) {
        const value = specs[String(actuator.motor)]?.[key];
        if (typeof value === 'number') values.set(String(actuator.urdf_joint), value);
    }
    return values;
}
