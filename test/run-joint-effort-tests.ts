/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import {
    effortHeat,
    effortRatio,
    FULL_HEAT_LOAD,
    loadsByJoint,
} from '../src/Utils/jointEffort.utils.ts';


function ratioIsTheLoadWhateverTheDirection() {
    assert.equal(effortRatio(0.5), 0.5);
    assert.equal(effortRatio(-0.5), 0.5);
}

function ratioStaysAtOneAboveFullLoad() {
    assert.equal(effortRatio(3), 1);
}

function heatIsFullAtFullHeatLoadInEitherDirection() {
    assert.equal(effortHeat(0), 0);
    assert.equal(effortHeat(-0.25), effortHeat(0.25));
    assert.equal(effortHeat(FULL_HEAT_LOAD), 1);
    assert.equal(effortHeat(0.9), 1);
}

function smallLoadsClimbTheScaleFasterThanLinear() {
    assert.ok(Math.abs(effortHeat(0.05) - Math.log10(1 + (9 * 0.05) / FULL_HEAT_LOAD)) < 1e-12);
    assert.ok(effortHeat(0.05) > 0.05 / FULL_HEAT_LOAD);
}

function loadsAreReadFromTheDynamicJointState() {
    const loads = loadsByJoint({
        joint_names: ['a', 'b', 'c', 'd'],
        interface_values: [
            { interface_names: ['position', 'load'], values: [1, -0.25] },
            { interface_names: ['load'], values: [0] },
            { interface_names: ['load'], values: [null] },
            { interface_names: ['position'], values: [1] },
        ],
    });
    assert.deepEqual([...loads], [['a', -0.25], ['b', 0]]);
}

const checks = [
    ratioIsTheLoadWhateverTheDirection,
    ratioStaysAtOneAboveFullLoad,
    heatIsFullAtFullHeatLoadInEitherDirection,
    smallLoadsClimbTheScaleFasterThanLinear,
    loadsAreReadFromTheDynamicJointState,
];

for (const check of checks) check();
console.log(`joint effort: ${checks.length} checks passed`);
