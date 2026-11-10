/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { effortArcRad, effortColor, effortSweepSign, isEffortVisible } from '../src/Utils/effortArrow.utils.ts';
import { effortHeat, FULL_HEAT_LOAD } from '../src/Utils/jointEffort.utils.ts';

const FULL_TURN = 2 * Math.PI;

function arcFillsTheCircleWhenTheColourTurnsRed() {
    assert.equal(effortArcRad(FULL_HEAT_LOAD), FULL_TURN);
    assert.equal(effortArcRad(1), FULL_TURN);
    assert.equal(effortArcRad(0.1), effortHeat(0.1) * FULL_TURN);
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

const loadAtHeat = (heat: number) => (FULL_HEAT_LOAD * (10 ** heat - 1)) / 9;

function colorGoesFromBlueToRedWithLoad() {
    assert.equal(effortColor(0), 'rgb(30, 80, 255)');
    assert.equal(effortColor(loadAtHeat(0.25)), 'rgb(0, 220, 255)');
    assert.equal(effortColor(loadAtHeat(0.5)), 'rgb(0, 217, 51)');
    assert.equal(effortColor(loadAtHeat(0.75)), 'rgb(255, 230, 0)');
    assert.equal(effortColor(FULL_HEAT_LOAD), 'rgb(220, 0, 0)');
    assert.equal(effortColor(1), 'rgb(220, 0, 0)');
}

const checks = [
    arcFillsTheCircleWhenTheColourTurnsRed,
    restingNoiseShowsNoArrow,
    aPressedMotorShowsItsArrowInEitherDirection,
    arrowOpposesTheServoLoadSign,
    colorGoesFromBlueToRedWithLoad,
];

for (const check of checks) check();
console.log(`effort arrow: ${checks.length} checks passed`);
