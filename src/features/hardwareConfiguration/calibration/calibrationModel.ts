/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** The wizard's pure logic: what to show for a backend state. No React, no ROS. */

export const HALF_TURN_TICK = 2047;
export const MAX_TICK = 4095;

export type CalibrationPhase =
    | 'unsupported'
    | 'idle'
    | 'recovery'
    | 'mid_pose'
    | 'joints'
    | 'review'
    | 'applied'
    | 'verify_drive';

export interface HealthCheck {
    id: string;
    required: boolean;
    ok: boolean;
    label: string;
}

export interface CalibrationJoint {
    name: string;
    min_span: number;
    full_turn: boolean;
    ticks: number | null;
}

export interface CalibrationStatus {
    phase: CalibrationPhase;
    message: string;
    warnings: string[];
    health: HealthCheck[];
    link: string | null;
    adapters: { port: string; serial: string | null }[];
    serial: string;
    preset: string;
    controller_topic: string;
    recording: string | null;
    range: [number, number] | null;
    accepted: Record<string, [number, number]>;
    joints: CalibrationJoint[];
}

export const EMPTY_STATUS: CalibrationStatus = {
    phase: 'idle',
    message: '',
    warnings: [],
    health: [],
    link: null,
    adapters: [],
    serial: '',
    preset: '',
    controller_topic: '',
    recording: null,
    range: null,
    accepted: {},
    joints: [],
};

export function parseStatus(json: string): CalibrationStatus | null {
    try {
        const raw = JSON.parse(json);
        return raw && typeof raw === 'object' ? { ...EMPTY_STATUS, ...raw } : null;
    } catch {
        return null;
    }
}

export const WIZARD_STEPS = ['Prepare', 'Mid pose', 'Joints', 'Review', 'Activate'] as const;

/** Which step of the wizard a state belongs to. Once activated, the wizard hands over to the control page. */
export function wizardStepIndex(phase: CalibrationPhase): number {
    switch (phase) {
        case 'mid_pose':
            return 1;
        case 'joints':
            return 2;
        case 'review':
            return 3;
        case 'applied':
        case 'verify_drive':
            return 4;
        default:
            return 0;
    }
}

export function requiredHealthOk(health: HealthCheck[]): boolean {
    return health.length > 0 && health.filter((c) => c.required).every((c) => c.ok);
}

/** The first joint not accepted yet, in the profile's proximal to distal order. */
export function nextJoint(status: CalibrationStatus): CalibrationJoint | null {
    return status.joints.find((j) => !(j.name in status.accepted)) ?? null;
}

export interface RangeBar {
    /** All positions are percentages of the encoder's range. */
    left: number;
    width: number;
    tick: number | null;
    mid: number;
    span: number;
    enough: boolean;
}

const percent = (tick: number) => (Math.min(MAX_TICK, Math.max(0, tick)) / MAX_TICK) * 100;

export function rangeBar(
    range: [number, number] | null,
    ticks: number | null,
    minSpan: number,
): RangeBar {
    const [low, high] = range ?? [HALF_TURN_TICK, HALF_TURN_TICK];
    const span = range ? high - low : 0;
    return {
        left: percent(low),
        width: percent(high) - percent(low),
        tick: ticks === null ? null : percent(ticks),
        mid: percent(HALF_TURN_TICK),
        span,
        enough: span >= minSpan,
    };
}

/** Radians for the coaching animation: the whole joint range and back, `t` in seconds. */
export function demoAngle(t: number, lower: number, upper: number, periodS = 4): number {
    const middle = (lower + upper) / 2;
    return middle + ((upper - lower) / 2) * Math.sin((2 * Math.PI * t) / periodS);
}

export const IDENTITY_NEEDS_WIZARD = new Set([
    'unreachable',
    'no_adapter',
    'ambiguous',
    'selected_missing',
    'open_failed',
    'bus_dead',
    'no_serial',
    'recovery',
    'no_binding',
    'offsets_differ',
]);

export interface HardwareIdentity {
    state: string;
    adapter_serial: string;
    matched_config: string;
    config_active: boolean;
    control_allowed: boolean;
    message: string;
}

export type BootRoute = 'none' | 'wizard' | 'activate';

/** The boot routing table: what to do about the arm that is connected. */
export function bootRoute(identity: HardwareIdentity): BootRoute {
    if (IDENTITY_NEEDS_WIZARD.has(identity.state)) return 'wizard';
    if (identity.state === 'match' && !identity.config_active) return 'activate';
    return 'none';
}

/** Pipeline errors can arrive as JSON objects with a `message`: show just that. */
export function readableError(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return trimmed;
    try {
        const parsed = JSON.parse(trimmed) as { message?: unknown };
        return typeof parsed.message === 'string' ? parsed.message : trimmed;
    } catch {
        return trimmed;
    }
}

const ERROR_HINTS: Record<string, string> = {
    span_too_small: 'Sweep the joint through its whole range, or accept it anyway.',
    control_active: 'Turn Control Robot off, in every open panel.',
};

export function errorHint(code: string): string {
    return ERROR_HINTS[code] ?? '';
}
