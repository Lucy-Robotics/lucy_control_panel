/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { servoPowerOf } from '../src/Utils/servoPower.utils.ts';
import { motorValuesByJoint, parseMotorSpecs } from '../src/Utils/motorSpecs.ts';

const volts = (...values: number[]) => new Map(values.map((v, i) => [`j${i}`, v]));
const sixVolts = new Map([['j0', 6], ['j1', 6]]);

assert.equal(servoPowerOf(volts(), sixVolts), 'unknown', 'no voltage readings: unknown');
assert.equal(servoPowerOf(volts(0, 0), new Map()), 'unknown', 'no motor specs: unknown');
assert.equal(servoPowerOf(volts(12.2, 6), sixVolts), 'on', 'every checked servo at or above its minimum: on');
assert.equal(servoPowerOf(volts(12.2, 5.9), sixVolts), 'off', 'one servo below its minimum: off');
assert.equal(servoPowerOf(volts(12.2, 12.2, 0), sixVolts), 'on', 'a joint without a motor spec is not checked');

const specs = parseMotorSpecs('sts3215/12v_345:\n  min_volts: 6.0\n  gear_ratio: 345\n');
const doc = { actuators: [
    { urdf_joint: 'Rotation', motor: 'sts3215/12v_345' },
    { urdf_joint: 'Jaw' },
    { urdf_joint: 'Pitch', motor: 'unknown/x' },
] };
assert.deepEqual([...motorValuesByJoint(doc, specs, 'min_volts')], [['Rotation', 6]], 'each joint gets its own motor value');
assert.equal(motorValuesByJoint(null, specs, 'min_volts').size, 0, 'no config: no values');
assert.deepEqual(parseMotorSpecs(undefined), {}, 'an older server without motors_yaml gives no specs');
assert.deepEqual(parseMotorSpecs('- not a map'), {}, 'a malformed motors_yaml gives no specs');
console.log('servo power tests passed');
