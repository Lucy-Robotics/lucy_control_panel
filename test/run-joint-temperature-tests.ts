/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { temperaturesByJoint } from '../src/Utils/jointTemperature.utils.ts';

function temperatureIsFoundWhereverTheInterfaceSits() {
    const temperatures = temperaturesByJoint({
        joint_names: ['a', 'b'],
        interface_values: [
            { interface_names: ['position', 'temperature'], values: [1, 41] },
            { interface_names: ['temperature', 'position'], values: [38, 2] },
        ],
    });
    assert.deepEqual([...temperatures], [['a', 41], ['b', 38]]);
}

function jointsWithoutATemperatureInterfaceAreLeftOut() {
    const temperatures = temperaturesByJoint({
        joint_names: ['a'],
        interface_values: [{ interface_names: ['position'], values: [1] }],
    });
    assert.equal(temperatures.size, 0);
}

function aJointMissingFromInterfaceValuesIsLeftOut() {
    const temperatures = temperaturesByJoint({ joint_names: ['a', 'b'], interface_values: [{ interface_names: ['temperature'], values: [40] }] });
    assert.deepEqual([...temperatures], [['a', 40]]);
    assert.equal(temperaturesByJoint({ joint_names: ['a'] }).size, 0);
}

function unmeasuredZeroAndNullReadingsAreLeftOut() {
    const temperatures = temperaturesByJoint({
        joint_names: ['a', 'b', 'c'],
        interface_values: [
            { interface_names: ['temperature'], values: [0] },
            { interface_names: ['temperature'], values: [null] },
            { interface_names: ['temperature'], values: [NaN] },
        ],
    });
    assert.equal(temperatures.size, 0);
}

function emptyMessagesYieldNoJoints() {
    assert.equal(temperaturesByJoint({}).size, 0);
}


const checks = [
    aJointMissingFromInterfaceValuesIsLeftOut,
    temperatureIsFoundWhereverTheInterfaceSits,
    jointsWithoutATemperatureInterfaceAreLeftOut,
    unmeasuredZeroAndNullReadingsAreLeftOut,
    emptyMessagesYieldNoJoints,
];

for (const check of checks) check();
console.log(`joint temperature: ${checks.length} checks passed`);
