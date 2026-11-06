/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import {
    effortArcRad,
    effortColor,
    effortHeat,
    effortRatio,
    effortSweepSign,
    loadsByJoint,
} from '../src/Utils/jointEffort.utils.ts';

const FULL_TURN = 2 * Math.PI;
const PRESSED_ELBOW = 0.188;

function ratioIsTheLoadWhateverTheDirection() {
    assert.equal(effortRatio(0.5), 0.5);
    assert.equal(effortRatio(-0.5), 0.5);
}

function ratioStaysAtOneAboveFullLoad() {
    assert.equal(effortRatio(3), 1);
}

function arcFillsTheCircleAtFullLoad() {
    assert.equal(effortArcRad(1), FULL_TURN);
}

function arcStaysVisibleAtZeroLoad() {
    assert.ok(effortArcRad(0) > 0);
}

function arcSweepFollowsTheLoadSign() {
    assert.equal(effortSweepSign(1), 1);
    assert.equal(effortSweepSign(0), 1);
    assert.equal(effortSweepSign(-1), -1);
}

function colorGoesFromWhiteAtRestToRedUnderLoad() {
    assert.equal(effortColor(0), 'hsl(60, 100%, 100%)');
    assert.equal(effortColor(0.5), 'hsl(0, 100%, 50%)');
    assert.equal(effortColor(1), 'hsl(0, 100%, 50%)');
}

function aPressedMotorIsClearlyOffWhite() {
    assert.equal(effortColor(PRESSED_ELBOW), 'hsl(37, 100%, 81%)');
}

function heatIsFullAtHalfLoadInEitherDirection() {
    assert.equal(effortHeat(0), 0);
    assert.equal(effortHeat(-0.25), 0.5);
    assert.equal(effortHeat(0.5), 1);
    assert.equal(effortHeat(0.9), 1);
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
    arcFillsTheCircleAtFullLoad,
    arcStaysVisibleAtZeroLoad,
    arcSweepFollowsTheLoadSign,
    colorGoesFromWhiteAtRestToRedUnderLoad,
    aPressedMotorIsClearlyOffWhite,
    heatIsFullAtHalfLoadInEitherDirection,
    loadsAreReadFromTheDynamicJointState,
];

for (const check of checks) check();
console.log(`joint effort: ${checks.length} checks passed`);
