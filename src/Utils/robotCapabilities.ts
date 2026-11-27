/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Per-robot capabilities declared in the URDF with a `<lucy_capabilities>` child
 * of `<robot>`, e.g. `<lucy_capabilities effort_feedback="false"/>`.
 * A capability the robot does not declare is off.
 */
const CAPABILITIES_TAG = 'lucy_capabilities';

function capabilitiesNode(robotNode: Element | null | undefined): Element | undefined {
    if (!robotNode) return undefined;
    return Array.from(robotNode.children).find(c => c.nodeName.toLowerCase() === CAPABILITIES_TAG);
}

function readFlag(robotNode: Element | null | undefined, attribute: string): boolean {
    const value = capabilitiesNode(robotNode)?.getAttribute(attribute)?.trim().toLowerCase();
    return value === 'true' || value === '1';
}

/** Whether the robot's servos report effort/load (drives the effort heat map and arrows). */
export function hasEffortFeedback(robotNode: Element | null | undefined): boolean {
    return readFlag(robotNode, 'effort_feedback');
}
