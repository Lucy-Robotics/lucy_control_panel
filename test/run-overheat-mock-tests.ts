/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { overheatMock, withOverheatMock } from '../src/Services/overheatMock.ts';

const real = new Map([['Elbow', 33], ['Pitch', 35]]);
assert.equal(withOverheatMock(real, new Map()), real, 'no mock leaves the real readings untouched');

overheatMock.set('Elbow', 52);
assert.deepEqual([...withOverheatMock(real, overheatMock.get())], [['Elbow', 52], ['Pitch', 35]], 'a mock replaces only its joint');

overheatMock.clear();
assert.equal(overheatMock.get().size, 0, 'clear drops every mock');

console.log('overheat mock: 3 checks passed');
