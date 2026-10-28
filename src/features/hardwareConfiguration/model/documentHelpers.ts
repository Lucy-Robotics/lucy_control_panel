/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CellErrorOpts } from '../../../Utils/hardwareConfigServerErrors.ts';
import {
    DEFAULT_ACTUATOR_TYPE_FALLBACK,
    DEFAULT_NEW_ACTUATOR_VALUES,
    DEFAULT_NEW_PRESSURE_SENSOR_VALUES,
} from '../../../Constants/hardwareConfigDefaults.ts';
import { listIgnoreUrdfJoints, listPassiveUrdfJoints } from './passiveUrdf.ts';

export function asMapping(v: unknown): Record<string, unknown> | null {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null;
}

export function boardSlots(doc: Record<string, unknown>, boardId: string): number {
    const boards = asMapping(doc.boards);
    const b = boards ? asMapping(boards[boardId]) : null;
    const n = b ? Number(b.internal_servo_slots) : NaN;
    return Number.isFinite(n) ? n : 0;
}

export function actOpts(actuatorId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `actuators.${actuatorId}.${field}`, rowPrefix: `actuators.${actuatorId}` };
}

export function sensOpts(sensorId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `sensors.${sensorId}.${field}`, rowPrefix: `sensors.${sensorId}` };
}

export function boardOpts(boardId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `boards.${boardId}.${field}`, rowPrefix: `boards.${boardId}` };
}

export function boardRowOpts(boardId: string): CellErrorOpts {
    return { rowPrefix: `boards.${boardId}` };
}

export function normalizeActuatorType(raw: unknown): string {
    const s = String(raw ?? '').trim().replace(/^["']|["']$/g, '');
    return s || DEFAULT_ACTUATOR_TYPE_FALLBACK;
}

const BOARD_ID_RE = /^rp2040_[a-z][a-z0-9_]*$/;

/** Required board mapping for a new Servo2040. Headers are fixed at 18. */
export function newServo2040Board(boardId: string): Record<string, unknown> | null {
    if (!BOARD_ID_RE.test(boardId)) return null;
    const suffix = boardId.slice('rp2040_'.length);
    return {
        serial_id: '',
        board_class: 'internal_servo_only',
        internal_servo_slots: 18,
        // Cargo UF2 path names artifacts by board id; this label is informational.
        firmware_target: `pico_${suffix}`,
        compile_definition: `USE_${suffix.toUpperCase()}`,
        topic_actuators: `actuators/${suffix}`,
        topic_sensors: `sensors/${suffix}`,
        controller: {
            name: `${suffix}_controller`,
            type: 'joint_trajectory_controller/JointTrajectoryController',
        },
    };
}

export function sortedBoardIds(doc: Record<string, unknown>): string[] {
    const boards = asMapping(doc.boards);
    return boards ? Object.keys(boards).sort() : [];
}

export function usedUrdfJointsOnOtherRows(actuators: Record<string, unknown>[], exceptIndex: number): Set<string> {
    const s = new Set<string>();
    actuators.forEach((a, i) => {
        if (i === exceptIndex) return;
        const j = String(a?.urdf_joint ?? '').trim();
        if (j) s.add(j);
    });
    return s;
}

/**
 * Build the JOINT select options for one actuator row.
 *
 * `catalog` is the pool of joint names assignable to actuators (typically
 * `assignableUrdfJointsFromYaml(doc)` — passive joints minus ignore minus already-assigned).
 * `usedElsewhere` is the set of joints assigned on *other* actuator rows (defensive filter:
 * a stale entry leaking into `catalog` is still hidden).
 * `currentJoint` is the joint name on the row being edited; it is always kept in the list so
 * legacy rows whose joint is no longer in the pool remain visible (and re-selectable).
 *
 * Options are always selectable — the previous "disable" behaviour produced a fully greyed-out
 * dropdown for any new actuator row (every option was on some other row, current was empty).
 */
export function jointSelectOptions(
    catalog: string[],
    usedElsewhere: Set<string>,
    currentJoint: string,
): { value: string; label: string }[] {
    const cur = currentJoint.trim();
    const ordered: string[] = [];
    const seen = new Set<string>();
    if (cur) {
        ordered.push(cur);
        seen.add(cur);
    }
    const catSorted = [...catalog].sort();
    for (const j of catSorted) {
        if (seen.has(j)) continue;
        if (usedElsewhere.has(j)) continue;
        ordered.push(j);
        seen.add(j);
    }
    return ordered.map((j) => ({ value: j, label: j }));
}

/** Physical pins already claimed on `boardId`, optionally ignoring one actuator or sensor row (YAML array index). */
export function usedPhysicalPinsOnBoardExcluding(
    doc: Record<string, unknown>,
    boardId: string,
    skip: { actuatorIndex?: number; sensorIndex?: number },
): Set<number> {
    const used = new Set<number>();
    if (Array.isArray(doc.actuators)) {
        doc.actuators.forEach((a, i) => {
            if (skip.actuatorIndex !== undefined && i === skip.actuatorIndex) return;
            const m = asMapping(a);
            if (!m || String(m.board ?? '') !== boardId) return;
            const plug = asMapping(m.plug);
            const p =
                plug?.kind === 'servo_header' ? Number(plug.header) : Number(m.physical_pin);
            if (Number.isFinite(p)) used.add(p);
        });
    }
    if (Array.isArray(doc.sensors)) {
        doc.sensors.forEach((s, i) => {
            if (skip.sensorIndex !== undefined && i === skip.sensorIndex) return;
            const m = asMapping(s);
            if (!m || String(m.board ?? '') !== boardId) return;
            const p = Number(m.physical_pin);
            if (Number.isFinite(p)) used.add(p);
        });
    }
    return used;
}

export function usedPhysicalPinsOnBoard(doc: Record<string, unknown>, boardId: string): Set<number> {
    return usedPhysicalPinsOnBoardExcluding(doc, boardId, {});
}

/** Available physical connector indices `1..slots` (`internal_servo_slots` YAML key), excluding pins taken by other rows. */
export function physicalPinOptions(slots: number, usedElsewhere: Set<number>, currentPin: number): number[] {
    const opts: number[] = [];
    const cur = Number.isFinite(currentPin) ? currentPin : 1;
    for (let p = 1; p <= slots; p++) {
        if (p === cur || !usedElsewhere.has(p)) opts.push(p);
    }
    return opts;
}

/** Physical pin indices `1..internal_servo_slots` not claimed by an actuator or sensor on this board. */
export function freePhysicalPinsOnBoard(doc: Record<string, unknown>, boardId: string): number[] {
    const slots = boardSlots(doc, boardId);
    if (slots <= 0) return [];
    const used = usedPhysicalPinsOnBoard(doc, boardId);
    const out: number[] = [];
    for (let p = 1; p <= slots; p++) {
        if (!used.has(p)) out.push(p);
    }
    return out;
}

export function actuatorCountOnBoard(doc: Record<string, unknown>, boardId: string): number {
    if (!Array.isArray(doc.actuators)) return 0;
    return doc.actuators.filter((a) => String(asMapping(a)?.board ?? '') === boardId).length;
}

export function sensorCountOnBoard(doc: Record<string, unknown>, boardId: string): number {
    if (!Array.isArray(doc.sensors)) return 0;
    return doc.sensors.filter((s) => String(asMapping(s)?.board ?? '') === boardId).length;
}

/** Keep contiguous sensor virtual_pin 0..n-1 on a board after add/remove (matches lucy_config_generator schema). */
export function renormalizeSensorVirtualPinsOnBoard(sensors: Record<string, unknown>[], boardId: string): void {
    const hits = sensors
        .map((s, idx) => ({
            idx,
            m: asMapping(s),
            vp: Number(asMapping(s)?.virtual_pin),
        }))
        .filter((x) => x.m && String(x.m.board ?? '') === boardId);
    hits.sort((a, b) => (Number.isFinite(a.vp) ? a.vp : 0) - (Number.isFinite(b.vp) ? b.vp : 0));
    hits.forEach((h, ord) => {
        const row = asMapping(sensors[h.idx]);
        if (!row) return;
        sensors[h.idx] = { ...row, virtual_pin: ord };
    });
}

function collectActuatorIds(doc: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    if (!Array.isArray(doc.actuators)) return ids;
    for (const a of doc.actuators) {
        const id = String(asMapping(a)?.id ?? '').trim();
        if (id) ids.add(id);
    }
    return ids;
}

function collectSensorIds(doc: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    if (!Array.isArray(doc.sensors)) return ids;
    for (const s of doc.sensors) {
        const id = String(asMapping(s)?.id ?? '').trim();
        if (id) ids.add(id);
    }
    return ids;
}

function uniqueActuatorId(doc: Record<string, unknown>, boardId: string, virtualPin: number): string {
    const short = boardId.replace(/^rp2040_/, '');
    const base = `act_${short}_${virtualPin}`;
    const existing = collectActuatorIds(doc);
    let candidate = base;
    let n = 0;
    while (existing.has(candidate)) {
        n += 1;
        candidate = `${base}_${n}`;
    }
    return candidate;
}

function uniquePressureSensorId(doc: Record<string, unknown>, boardId: string, virtualPin: number): string {
    const short = boardId.replace(/^rp2040_/, '');
    const base = `pressure_${short}_${virtualPin}`;
    const existing = collectSensorIds(doc);
    let candidate = base;
    let n = 0;
    while (existing.has(candidate)) {
        n += 1;
        candidate = `${base}_${n}`;
    }
    return candidate;
}

export function defaultNewActuatorRow(doc: Record<string, unknown>, boardId: string): Record<string, unknown> | null {
    const free = freeActuatorPlugChoices(doc, boardId);
    if (free.length === 0) return null;
    const vp = actuatorCountOnBoard(doc, boardId);
    const id = uniqueActuatorId(doc, boardId, vp);
    const row: Record<string, unknown> = {
        id,
        urdf_joint: '',
        board: boardId,
        virtual_pin: vp,
        ...DEFAULT_NEW_ACTUATOR_VALUES,
    };
    applyPlugChoice(row, free[0].value);
    return row;
}

export function defaultNewPressureSensorRow(
    doc: Record<string, unknown>,
    associatedActuatorId: string,
): Record<string, unknown> | null {
    const acts = Array.isArray(doc.actuators) ? doc.actuators : [];
    const act = acts.map((a) => asMapping(a)).find((m) => String(m?.id ?? '').trim() === associatedActuatorId);
    if (!act) return null;
    const boardId = String(act.board ?? '').trim();
    if (!boardId) return null;
    const pins = freePhysicalPinsOnBoard(doc, boardId);
    if (pins.length === 0) return null;
    const vp = sensorCountOnBoard(doc, boardId);
    const id = uniquePressureSensorId(doc, boardId, vp);
    return {
        id,
        type: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.type,
        associated_actuator: associatedActuatorId,
        board: boardId,
        virtual_pin: vp,
        physical_pin: pins[0],
        min_value: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.min_value,
        max_value: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.max_value,
        enabled: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.enabled,
    };
}

/**
 * URDF joints currently free to assign to an actuator row.
 *
 * Pool source: `passive_urdf_joints` (and synonyms `urdf_passive`, `urdf_passive_joints`) —
 * the canonical "unassigned URDF joints" list maintained by the editor itself
 * (see `passiveUrdf.ts::appendPassiveUrdfJointIfUnassigned`, fired on delete / clear).
 *
 * Filters:
 *   - Drop anything in `ignore_urdf_joints` (and synonyms): those are URDF joints the operator
 *     never wants exposed as actuator candidates (fixed fingers, helper links, …).
 *   - Drop joints already mapped to any actuator row — they're "taken", not assignable.
 *
 * Note: per-row exclusions (everything assigned on *other* rows while keeping the row's own
 * value visible) are still applied in `jointSelectOptions` for safety.
 */
export type PlugChoice = { value: string; label: string };

const HEADER_MIN = 1;
const HEADER_MAX = 18;
/** Shared PWM slice pairs the schema rejects when both ends are claimed. */
const SHARED_PWM_PAIRS: ReadonlyArray<readonly [number, number]> = [
    [1, 17],
    [2, 18],
];

/**
 * Header and PCA choices still free on this actuator's board.
 * Mirrors server `assign_plug` / `assign_pca_plug` options; uniqueness is
 * still enforced on save.
 */
export function plugChoices(
    doc: Record<string, unknown>,
    boardId: string,
    actuatorIndex: number,
): PlugChoice[] {
    const choices: PlugChoice[] = [];
    // Occupancy: actuators + sensors share the physical header pin space.
    const usedHeaders = usedPhysicalPinsOnBoardExcluding(doc, boardId, { actuatorIndex });
    const actuators = Array.isArray(doc.actuators) ? doc.actuators : [];
    const current = asMapping(actuators[actuatorIndex]);
    const currentPlug = current ? asMapping(current.plug) : null;
    const currentHeader =
        currentPlug?.kind === 'servo_header'
            ? Number(currentPlug.header)
            : Number(current?.physical_pin);
    // Shared-PWM pairs match server `header_constraint_errors` (actuators only).
    const actuatorHeaders = new Set<number>();
    actuators.forEach((raw, index) => {
        if (index === actuatorIndex) return;
        const row = asMapping(raw);
        if (!row || String(row.board ?? '') !== boardId) return;
        const plug = asMapping(row.plug);
        const header =
            plug?.kind === 'servo_header' ? Number(plug.header) : Number(row.physical_pin);
        if (Number.isFinite(header)) actuatorHeaders.add(header);
    });
    const blockedByPair = new Set<number>();
    for (const [left, right] of SHARED_PWM_PAIRS) {
        if (actuatorHeaders.has(left) && left !== currentHeader) blockedByPair.add(right);
        if (actuatorHeaders.has(right) && right !== currentHeader) blockedByPair.add(left);
    }
    const slots = boardSlots(doc, boardId);
    const maxHeader = slots > 0 ? Math.min(HEADER_MAX, slots) : 0;
    for (let header = HEADER_MIN; header <= maxHeader; header += 1) {
        if (usedHeaders.has(header) && header !== currentHeader) continue;
        // Keep the row's current header visible even if its PWM partner is taken.
        if (blockedByPair.has(header) && header !== currentHeader) continue;
        choices.push({ value: `header:${header}`, label: `Servo${header}` });
    }
    const boards = asMapping(doc.boards);
    const board = boards ? asMapping(boards[boardId]) : null;
    const devices = Array.isArray(board?.i2c_devices) ? board.i2c_devices : [];
    const usedChannels = new Set<string>();
    actuators.forEach((raw, index) => {
        if (index === actuatorIndex) return;
        const row = asMapping(raw);
        const plug = row ? asMapping(row.plug) : null;
        if (!row || row.board !== boardId || plug?.kind !== 'pca9685') return;
        usedChannels.add(`${String(plug.device)}:${Number(plug.channel)}`);
    });
    for (const raw of devices) {
        const device = asMapping(raw);
        if (!device || device.type !== 'pca9685') continue;
        const id = String(device.id ?? '');
        for (let channel = 0; channel < 16; channel += 1) {
            const key = `${id}:${channel}`;
            if (usedChannels.has(key)) continue;
            const address = Number(device.address);
            const hex = Number.isFinite(address) ? `0x${address.toString(16)}` : '?';
            choices.push({ value: `pca:${id}:${channel}`, label: `${id} ${hex} ch${channel}` });
        }
    }
    return choices;
}

export function plugValue(row: Record<string, unknown>): string | undefined {
    const plug = asMapping(row.plug);
    if (plug?.kind === 'pca9685') return `pca:${String(plug.device)}:${Number(plug.channel)}`;
    if (plug?.kind === 'servo_header') return `header:${Number(plug.header)}`;
    const header = Number(row.physical_pin);
    return Number.isFinite(header) ? `header:${header}` : undefined;
}

/** Mirror of server `assign_plug` / `assign_pca_plug`. Only writer for plugs in the panel. */
export function applyPlugChoice(row: Record<string, unknown>, value: string): void {
    if (value.startsWith('header:')) {
        const header = Number(value.slice('header:'.length));
        row.plug = { kind: 'servo_header', header };
        row.physical_pin = header;
        return;
    }
    const [, device, channelText] = value.split(':');
    row.plug = { kind: 'pca9685', device, channel: Number(channelText) };
    delete row.physical_pin;
}

/** Plug choices available if a new actuator were added on this board. */
export function freeActuatorPlugChoices(doc: Record<string, unknown>, boardId: string): PlugChoice[] {
    const actuators = Array.isArray(doc.actuators) ? (doc.actuators as Record<string, unknown>[]) : [];
    const provisionalIndex = actuators.length;
    const provisionalDoc: Record<string, unknown> = {
        ...doc,
        actuators: [...actuators, { board: boardId }],
    };
    return plugChoices(provisionalDoc, boardId, provisionalIndex);
}

/** True when the board still has a free header or PCA channel for a new actuator. */
export function boardHasFreeActuatorPlug(doc: Record<string, unknown>, boardId: string): boolean {
    return freeActuatorPlugChoices(doc, boardId).length > 0;
}

export function assignableUrdfJointsFromYaml(doc: Record<string, unknown>): string[] {
    const ignore = new Set<string>(listIgnoreUrdfJoints(doc));
    const assigned = new Set<string>();
    if (Array.isArray(doc.actuators)) {
        for (const a of doc.actuators) {
            const m = asMapping(a);
            const j = String(m?.urdf_joint ?? '').trim();
            if (j) assigned.add(j);
        }
    }

    const pool = new Set<string>(listPassiveUrdfJoints(doc));
    return [...pool].filter((j) => !ignore.has(j) && !assigned.has(j)).sort();
}
