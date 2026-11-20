/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { hasEffortFeedback } from '../src/Utils/robotCapabilities.ts';

const { DOMParser } = new JSDOM().window;

function robotNode(body: string): Element {
    return new DOMParser().parseFromString(`<robot name="r">${body}</robot>`, 'text/xml').documentElement;
}

function robotsWithoutTheTagReportNoEffort() {
    assert.equal(hasEffortFeedback(robotNode('<link name="base"/>')), false);
    assert.equal(hasEffortFeedback(null), false);
    assert.equal(hasEffortFeedback(undefined), false);
}

function aTagWithoutTheAttributeReportsNoEffort() {
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities/>')), false);
}

function effortFeedbackFollowsTheAttribute() {
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="true"/>')), true);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="false"/>')), false);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback=" False "/>')), false);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="0"/>')), false);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback=" TRUE "/>')), true);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="1"/>')), true);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="yes please"/>')), false);
}

function onlyADirectChildOfRobotCounts() {
    assert.equal(hasEffortFeedback(robotNode('<link name="a"><lucy_capabilities effort_feedback="true"/></link>')), false);
}

const checks = [
    robotsWithoutTheTagReportNoEffort,
    aTagWithoutTheAttributeReportsNoEffort,
    effortFeedbackFollowsTheAttribute,
    onlyADirectChildOfRobotCounts,
];

for (const check of checks) check();
console.log(`robot capabilities: ${checks.length} checks passed`);
