/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import {
    HARD_LIMIT_CELSIUS,
    NO_OVERHEAT,
    OVERHEAT_CELSIUS,
    OVERHEAT_REARM_CELSIUS,
    acceptOverheat,
    jointsAllowedToContinue,
    nextOverheatState,
    temperatureHeat,
    torqueCommands,
    torqueTopicOf,
} from '../src/Utils/motorOverheat.utils.ts';

const reading = (celsius: number) => new Map([['elbow', celsius]]);
const trippedAt = (celsius: number) => nextOverheatState(NO_OVERHEAT, reading(celsius));

function exactlyTheCutoffDoesNotTrip() {
    assert.equal(trippedAt(OVERHEAT_CELSIUS).tripped.size, 0);
}

function aboveTheCutoffTripsTheMotor() {
    assert.ok(trippedAt(OVERHEAT_CELSIUS + 1).tripped.has('elbow'));
}

function onlyTheHotMotorTrips() {
    const state = nextOverheatState(NO_OVERHEAT, new Map([['elbow', 55], ['jaw', 25]]));
    assert.deepEqual([...state.tripped], ['elbow']);
}

function aTrippedMotorStaysTrippedAfterCooling() {
    assert.ok(nextOverheatState(trippedAt(55), reading(20)).tripped.has('elbow'));
}

function continuingReleasesTheMotorBelowTheHardLimit() {
    assert.equal(acceptOverheat(trippedAt(55), reading(55)).tripped.size, 0);
}

function anAcceptedMotorDoesNotTripAgainWhileItStaysHot() {
    const accepted = acceptOverheat(trippedAt(55), reading(55));
    assert.equal(nextOverheatState(accepted, reading(57)).tripped.size, 0);
}

function continuingIsRefusedAtTheHardLimit() {
    const state = trippedAt(HARD_LIMIT_CELSIUS);
    assert.deepEqual(jointsAllowedToContinue(state, reading(HARD_LIMIT_CELSIUS)), []);
    assert.ok(acceptOverheat(state, reading(HARD_LIMIT_CELSIUS)).tripped.has('elbow'));
}

function theHardLimitOverridesAnEarlierContinue() {
    const accepted = acceptOverheat(trippedAt(55), reading(55));
    const state = nextOverheatState(accepted, reading(HARD_LIMIT_CELSIUS));
    assert.ok(state.tripped.has('elbow'));
    assert.equal(state.accepted.size, 0);
}

function theHardLimitNeedsAFreshContinueAfterCooling() {
    const accepted = acceptOverheat(trippedAt(55), reading(55));
    const atLimit = nextOverheatState(accepted, reading(HARD_LIMIT_CELSIUS));
    const cooled = nextOverheatState(atLimit, reading(55));
    assert.ok(cooled.tripped.has('elbow'));
    assert.deepEqual(jointsAllowedToContinue(cooled, reading(55)), ['elbow']);
}

function aMotorWithoutAReadingCannotContinue() {
    assert.deepEqual(jointsAllowedToContinue(trippedAt(55), new Map()), []);
}

function coolingBelowTheRearmPointMakesTheNextOverheatTripAgain() {
    const accepted = acceptOverheat(trippedAt(55), reading(55));
    const cooled = nextOverheatState(accepted, reading(OVERHEAT_REARM_CELSIUS));
    assert.ok(nextOverheatState(cooled, reading(55)).tripped.has('elbow'));
}

function flickerAroundTheCutoffDoesNotTripAnAcceptedMotor() {
    const accepted = acceptOverheat(trippedAt(OVERHEAT_CELSIUS + 1), reading(OVERHEAT_CELSIUS + 1));
    const dipped = nextOverheatState(accepted, reading(OVERHEAT_CELSIUS));
    assert.equal(nextOverheatState(dipped, reading(OVERHEAT_CELSIUS + 1)).tripped.size, 0);
}

function anUnchangedReadingKeepsTheSameState() {
    const state = trippedAt(55);
    assert.equal(nextOverheatState(state, reading(56)), state);
}

function torqueTopicFollowsTheConfigGeneratorNaming() {
    assert.equal(torqueTopicOf('/so_arm_controller/joint_trajectory'), '/so_arm_torque_enable_controller/commands');
    assert.equal(torqueTopicOf('/arm/joint_trajectory'), '/arm_torque_enable/commands');
}

function torqueCommandsDropOnlyTheTrippedJointInControllerOrder() {
    const commands = torqueCommands(
        [{ topic: '/so_arm_controller/joint_trajectory', joints: ['rotation', 'elbow', 'jaw'] }],
        new Set(['elbow']),
    );
    assert.deepEqual(commands, [{ topic: '/so_arm_torque_enable_controller/commands', data: [1, 0, 1] }]);
}

function heatGoesFromCoolToTheHardLimit() {
    assert.equal(temperatureHeat(25), 0);
    assert.equal(temperatureHeat(45), 0.5);
    assert.equal(temperatureHeat(HARD_LIMIT_CELSIUS), 1);
    assert.equal(temperatureHeat(90), 1);
}

const checks = [
    exactlyTheCutoffDoesNotTrip,
    aboveTheCutoffTripsTheMotor,
    onlyTheHotMotorTrips,
    aTrippedMotorStaysTrippedAfterCooling,
    continuingReleasesTheMotorBelowTheHardLimit,
    anAcceptedMotorDoesNotTripAgainWhileItStaysHot,
    continuingIsRefusedAtTheHardLimit,
    theHardLimitOverridesAnEarlierContinue,
    theHardLimitNeedsAFreshContinueAfterCooling,
    aMotorWithoutAReadingCannotContinue,
    coolingBelowTheRearmPointMakesTheNextOverheatTripAgain,
    flickerAroundTheCutoffDoesNotTripAnAcceptedMotor,
    anUnchangedReadingKeepsTheSameState,
    torqueTopicFollowsTheConfigGeneratorNaming,
    torqueCommandsDropOnlyTheTrippedJointInControllerOrder,
    heatGoesFromCoolToTheHardLimit,
];

for (const check of checks) check();
console.log(`motor overheat: ${checks.length} checks passed`);
