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

function robotsWithoutTheTagReportEffort() {
    assert.equal(hasEffortFeedback(robotNode('<link name="base"/>')), true);
    assert.equal(hasEffortFeedback(null), true);
    assert.equal(hasEffortFeedback(undefined), true);
}

function aTagWithoutTheAttributeReportsEffort() {
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities/>')), true);
}

function effortFeedbackFollowsTheAttribute() {
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="true"/>')), true);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="false"/>')), false);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback=" False "/>')), false);
    assert.equal(hasEffortFeedback(robotNode('<lucy_capabilities effort_feedback="0"/>')), false);
}

function onlyADirectChildOfRobotCounts() {
    assert.equal(hasEffortFeedback(robotNode('<link name="a"><lucy_capabilities effort_feedback="false"/></link>')), true);
}

const checks = [
    robotsWithoutTheTagReportEffort,
    aTagWithoutTheAttributeReportsEffort,
    effortFeedbackFollowsTheAttribute,
    onlyADirectChildOfRobotCounts,
];

for (const check of checks) check();
console.log(`robot capabilities: ${checks.length} checks passed`);
