/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import './react-harness.ts';

const { meshFetchConcurrency } = await import('../src/hooks/useRobotModel.ts');

test('a server that answered with a GLB is fetched 16 at a time, even with large meshes', () => {
    assert.equal(meshFetchConcurrency(true, 0), 16);
    assert.equal(meshFetchConcurrency(true, 5), 16);
});

test('a robot with STL/OBJ meshes and no GLB is fetched 2 at a time', () => {
    assert.equal(meshFetchConcurrency(false, 1), 2);
});

test('a robot without large meshes and no GLB is fetched 8 at a time', () => {
    assert.equal(meshFetchConcurrency(false, 0), 8);
});
