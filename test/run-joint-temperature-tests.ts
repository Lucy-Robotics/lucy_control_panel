/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { createTemperatureMedian, formatTemperature, temperaturesByJoint } from '../src/Utils/jointTemperature.utils.ts';

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

function temperatureIsShownInWholeDegrees() {
    assert.equal(formatTemperature(41.6), '42 °C');
}

const elbow = (celsius: number) => new Map([['elbow', celsius]]);

function feed(median: ReturnType<typeof createTemperatureMedian>, readings: number[], stepMs: number) {
    let result = new Map<string, number>();
    readings.forEach((celsius, i) => { result = median(elbow(celsius), i * stepMs); });
    return result;
}

function noTemperatureIsReportedBeforeAFullWindow() {
    assert.equal(feed(createTemperatureMedian(3000), [55, 55, 55], 1000).size, 0);
}

function theTemperatureIsTheMedianOfTheWindow() {
    const result = feed(createTemperatureMedian(3000), [30, 30, 40, 50, 60], 1000);
    assert.equal(result.get('elbow'), 50);
}

function aFalseReadingHeldHalfASecondIsIgnored() {
    const readings = Array.from({ length: 300 }, (_, i) => (i >= 250 ? 255 : 38));
    assert.equal(feed(createTemperatureMedian(3000), readings, 10.1).get('elbow'), 38);
}

function aSustainedRiseReachesTheMedian() {
    const readings = [...Array.from({ length: 301 }, () => 38), ...Array.from({ length: 300 }, () => 55)];
    assert.equal(feed(createTemperatureMedian(3000), readings, 10).get('elbow'), 55);
}

const checks = [
    temperatureIsFoundWhereverTheInterfaceSits,
    jointsWithoutATemperatureInterfaceAreLeftOut,
    unmeasuredZeroAndNullReadingsAreLeftOut,
    emptyMessagesYieldNoJoints,
    temperatureIsShownInWholeDegrees,
    noTemperatureIsReportedBeforeAFullWindow,
    theTemperatureIsTheMedianOfTheWindow,
    aFalseReadingHeldHalfASecondIsIgnored,
    aSustainedRiseReachesTheMedian,
];

for (const check of checks) check();
console.log(`joint temperature: ${checks.length} checks passed`);
