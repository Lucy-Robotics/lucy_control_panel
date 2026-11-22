/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CalibrationPhase, HealthCheck } from './calibrationModel.ts';

/** Phases where the arm's health decides whether the wizard may move on. */
const GATED_PHASES: ReadonlySet<CalibrationPhase> = new Set(['idle', 'mid_pose', 'joints', 'review']);

/** The required checks failing now. Starting takes the control lock, so it is not asked for before. */
export function blockingChecks(phase: CalibrationPhase, health: HealthCheck[]): HealthCheck[] {
    if (!GATED_PHASES.has(phase)) return [];
    return health.filter((c) => c.required && !c.ok && !(phase === 'idle' && c.id === 'control_lock'));
}

/** True while the wizard must not act: a required check fails, or none has been reported yet. */
export function calibrationBlocked(phase: CalibrationPhase, health: HealthCheck[]): boolean {
    if (!GATED_PHASES.has(phase)) return false;
    return health.length === 0 || blockingChecks(phase, health).length > 0;
}
