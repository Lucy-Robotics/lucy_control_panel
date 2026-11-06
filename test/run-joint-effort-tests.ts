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
    isEffortVisible,
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

function restingNoiseShowsNoArrow() {
    assert.equal(isEffortVisible(0), false);
    assert.equal(isEffortVisible(0.048), false);
}

function aPressedMotorShowsItsArrowInEitherDirection() {
    assert.equal(isEffortVisible(0.188), true);
    assert.equal(isEffortVisible(-0.188), true);
}

function arrowOpposesTheServoLoadSign() {
    assert.equal(effortSweepSign(1), -1);
    assert.equal(effortSweepSign(0), 1);
    assert.equal(effortSweepSign(-1), 1);
}

function colorGoesFromBlueToRedWithLoad() {
    assert.equal(effortColor(0), 'rgb(30, 80, 255)');
    assert.equal(effortColor(0.125), 'rgb(0, 220, 255)');
    assert.equal(effortColor(0.25), 'rgb(0, 217, 51)');
    assert.equal(effortColor(0.375), 'rgb(255, 230, 0)');
    assert.equal(effortColor(0.5), 'rgb(220, 0, 0)');
    assert.equal(effortColor(1), 'rgb(220, 0, 0)');
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
    restingNoiseShowsNoArrow,
    aPressedMotorShowsItsArrowInEitherDirection,
    arrowOpposesTheServoLoadSign,
    colorGoesFromBlueToRedWithLoad,
    heatIsFullAtHalfLoadInEitherDirection,
    loadsAreReadFromTheDynamicJointState,
];

for (const check of checks) check();
console.log(`joint effort: ${checks.length} checks passed`);
