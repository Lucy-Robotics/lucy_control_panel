/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import type { JointControlState } from '../src/Constants/robotTypes.ts';
import { withEncoderFeedback, withJointsEncoderFeedback } from '../src/Utils/jointFeedback.utils.ts';

const joint = (overrides: Partial<JointControlState> = {}): JointControlState => ({
    name: 'elbow',
    currentValue: 1,
    targetValue: 1,
    actualValue: 1,
    minValue: 0,
    maxValue: 3,
    type: 'revolute',
    category: 'arm',
    ...overrides,
});

const NOBODY = { nobodyControls: true, holdsControl: false };
const SOMEONE_ELSE = { nobodyControls: false, holdsControl: false };
const ME = { nobodyControls: false, holdsControl: true };

function sliderFollowsTheEncoderWhenNobodyControls() {
    const moved = withEncoderFeedback(joint(), 2, NOBODY);
    assert.equal(moved.currentValue, 2);
    assert.equal(moved.targetValue, 2);
    assert.equal(moved.actualValue, 2);
}

function sliderKeepsItsTargetWhileThisPanelControls() {
    const moved = withEncoderFeedback(joint(), 2, ME);
    assert.equal(moved.currentValue, 1);
    assert.equal(moved.actualValue, 2);
}

function sliderIsLeftToTheCommandStreamWhenAnotherClientControls() {
    const moved = withEncoderFeedback(joint(), 2, SOMEONE_ELSE);
    assert.equal(moved.currentValue, 1);
    assert.equal(moved.actualValue, 2);
}

function firstFeedbackSeedsTheSliderUnlessThisPanelControls() {
    assert.equal(withEncoderFeedback(joint({ actualValue: undefined }), 2, SOMEONE_ELSE).currentValue, 2);
    assert.equal(withEncoderFeedback(joint({ actualValue: undefined }), 2, ME).currentValue, 1);
}

function sliderCatchesUpWhenControlEndsOnAStillArm() {
    const released = withEncoderFeedback(joint({ actualValue: 2 }), 2, NOBODY);
    assert.equal(released.currentValue, 2);
    assert.equal(released.targetValue, 2);
}

function encoderNoiseKeepsTheSameJoint() {
    const steady = joint();
    assert.equal(withEncoderFeedback(steady, 1.0001, NOBODY), steady);
}

function aTrippedJointFollowsTheEncoderWhileIHoldControl() {
    const joints = [joint({ name: 'elbow' }), joint({ name: 'wrist' })];
    const actuals = new Map([['elbow', 0.4], ['wrist', 0.4]]);
    const [elbow, wrist] = withJointsEncoderFeedback(joints, actuals, { ...ME, tripped: new Set(['elbow']) });
    assert.equal(elbow.targetValue, 0.4, 'a joint without torque must not jump back to its old target');
    assert.equal(wrist.targetValue, 1, 'a joint with torque keeps my target');
}

function unchangedJointsKeepTheSameList() {
    const joints = [joint()];
    assert.equal(withJointsEncoderFeedback(joints, new Map([['elbow', 1]]), { ...ME, tripped: new Set() }), joints);
    assert.equal(withJointsEncoderFeedback(joints, new Map(), { ...NOBODY, tripped: new Set() }), joints);
}

const checks = [
    aTrippedJointFollowsTheEncoderWhileIHoldControl,
    unchangedJointsKeepTheSameList,
    sliderFollowsTheEncoderWhenNobodyControls,
    sliderKeepsItsTargetWhileThisPanelControls,
    sliderIsLeftToTheCommandStreamWhenAnotherClientControls,
    firstFeedbackSeedsTheSliderUnlessThisPanelControls,
    sliderCatchesUpWhenControlEndsOnAStillArm,
    encoderNoiseKeepsTheSameJoint,
];

for (const check of checks) check();
console.log(`joint feedback: ${checks.length} checks passed`);
