/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { WorkflowStepId, WorkflowStepSlice } from './activateWorkflowStepTypes.ts';

const SKIP_PREFIX = /^skip \w+:\s*/i;

export function pipelineSkipDetail(detail: string | undefined): string | null {
    if (!detail || !SKIP_PREFIX.test(detail)) return null;
    return `Skipped (${detail.replace(SKIP_PREFIX, '')})`;
}

export function stepMarkers(patchStep: (id: WorkflowStepId, patch: Partial<WorkflowStepSlice>) => void) {
    const skipped = new Set<WorkflowStepId>();
    return {
        markDone: (id: WorkflowStepId) => {
            if (!skipped.has(id)) patchStep(id, { status: 'done', fraction: 1, detail: 'OK' });
        },
        markSkipped: (id: WorkflowStepId, detail: string) => {
            skipped.add(id);
            patchStep(id, { status: 'skipped', fraction: 0, detail });
        },
    };
}
