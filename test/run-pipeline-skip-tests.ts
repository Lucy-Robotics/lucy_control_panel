/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { pipelineSkipDetail, stepMarkers } from '../src/features/hardwareConfiguration/pipelineSkip.ts';

assert.equal(
    pipelineSkipDetail('skip flash: Linux host firmware (linux_so_arm)'),
    'Skipped (Linux host firmware (linux_so_arm))',
    'a skip feedback becomes a Skipped detail with its reason',
);
assert.equal(pipelineSkipDetail('flash completed for rp2040_left_arm'), null, 'other feedback is not a skip');
assert.equal(pipelineSkipDetail(undefined), null, 'missing feedback is not a skip');

const patches: [string, string | undefined][] = [];
const { markDone, markSkipped } = stepMarkers((id, patch) => patches.push([id, patch.status]));
markSkipped('flash', 'Skipped (Linux host firmware)');
markDone('flash');
markDone('build');
assert.deepEqual(patches, [['flash', 'skipped'], ['build', 'done']], 'a skipped step stays skipped when the pipeline finishes');

console.log('pipeline skip: 4 checks passed');
