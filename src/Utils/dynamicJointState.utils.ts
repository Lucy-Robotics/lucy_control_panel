/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface DynamicJointState {
    joint_names?: string[];
    interface_values?: { interface_names?: string[]; values?: (number | null)[] }[];
}

export function interfaceValuesByJoint(
    { joint_names, interface_values }: DynamicJointState,
    interfaceName: string,
): Map<string, number> {
    const byJoint = new Map<string, number>();
    joint_names?.forEach((name, i) => {
        const interfaces = interface_values?.[i];
        const slot = interfaces?.interface_names?.indexOf(interfaceName) ?? -1;
        const value = interfaces?.values?.[slot];
        if (typeof value === 'number' && Number.isFinite(value)) byJoint.set(name, value);
    });
    return byJoint;
}
