/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import {
    FULL_SCALE_EFFORT_NM,
    effortArcRad,
    effortColor,
    effortRatio,
    effortSweepSign,
    effortTints,
    effortsByJoint,
} from '../src/Utils/jointEffort.utils.ts';

const FULL_TURN = 2 * Math.PI;

function ratioIsTheShareOfStallTorqueWhateverTheDirection() {
    assert.equal(effortRatio(FULL_SCALE_EFFORT_NM / 2), 0.5);
    assert.equal(effortRatio(-FULL_SCALE_EFFORT_NM / 2), 0.5);
}

function ratioStaysAtOneAboveStallTorque() {
    assert.equal(effortRatio(FULL_SCALE_EFFORT_NM * 3), 1);
}

function arcFillsTheCircleAtStallTorque() {
    assert.equal(effortArcRad(FULL_SCALE_EFFORT_NM), FULL_TURN);
}

function arcStaysVisibleAtZeroEffort() {
    assert.ok(effortArcRad(0) > 0);
}

function arcSweepFollowsTheEffortSign() {
    assert.equal(effortSweepSign(1), 1);
    assert.equal(effortSweepSign(0), 1);
    assert.equal(effortSweepSign(-1), -1);
}

function colorGoesFromGreenAtRestToRedAtStall() {
    assert.equal(effortColor(0), 'hsl(120, 90%, 50%)');
    assert.equal(effortColor(FULL_SCALE_EFFORT_NM), 'hsl(0, 90%, 50%)');
}

function aMotorUnderLoadGetsItsEffortColor() {
    assert.deepEqual([...effortTints(new Map([['a', FULL_SCALE_EFFORT_NM]]))], [['a', 'hsl(0, 90%, 50%)']]);
}

function aMotorAtRestKeepsItsOwnColor() {
    assert.equal(effortTints(new Map([['a', 0]])).size, 0);
}

function jointsWithoutAMeasuredEffortAreLeftOut() {
    const efforts = effortsByJoint(['a', 'b', 'c', 'd'], [1.5, null, NaN, 0]);
    assert.deepEqual([...efforts], [['a', 1.5], ['d', 0]]);
}

function messagesWithoutEffortsYieldNoJoints() {
    assert.equal(effortsByJoint(['a'], []).size, 0);
    assert.equal(effortsByJoint(['a']).size, 0);
}

const checks = [
    ratioIsTheShareOfStallTorqueWhateverTheDirection,
    ratioStaysAtOneAboveStallTorque,
    arcFillsTheCircleAtStallTorque,
    arcStaysVisibleAtZeroEffort,
    arcSweepFollowsTheEffortSign,
    colorGoesFromGreenAtRestToRedAtStall,
    aMotorUnderLoadGetsItsEffortColor,
    aMotorAtRestKeepsItsOwnColor,
    jointsWithoutAMeasuredEffortAreLeftOut,
    messagesWithoutEffortsYieldNoJoints,
];

for (const check of checks) check();
console.log(`joint effort: ${checks.length} checks passed`);
