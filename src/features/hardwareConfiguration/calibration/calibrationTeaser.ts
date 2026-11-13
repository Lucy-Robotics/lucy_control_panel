/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type CalibrationTeaser =
    | { kind: 'needs-real-hardware'; message: string }
    | { kind: 'coming-soon'; message: string };

/** What the Calibrate tab teases instead of the wizard, or null when the wizard is usable. */
export function calibrationTeaser(
    robotPackage: string,
    supported: boolean,
    mockHardware: boolean,
): CalibrationTeaser | null {
    const robot = robotPackage.replace(/_urdf$/, '') || 'robot';
    if (!supported) {
        return { kind: 'coming-soon', message: `Calibration is coming soon for your ${robot} !` };
    }
    if (mockHardware) {
        return {
            kind: 'needs-real-hardware',
            message: `To calibrate your own ${robot}, restart the stack enabling "Real hardware" mode`,
        };
    }
    return null;
}
