/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Popconfirm, Select, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RefObject } from 'react';
import {
    cellOutlineStyle,
    cellTooltipText,
    type OutlineBorderSet,
} from '../../../Utils/hardwareConfigServerErrors.ts';
import type { ActuatorTableRecord } from '../types.ts';
import {
    actOpts,
    jointSelectOptions,
    normalizeActuatorType,
    applyPlugChoice,
    plugChoices,
    plugValue,
    sortedBoardIds,
    usedUrdfJointsOnOtherRows,
} from '../model/documentHelpers.ts';
import {
    appendPassiveUrdfJointIfUnassigned,
    removePassiveUrdfJoint,
} from '../model/passiveUrdf.ts';
import { DegAngleInputNumber } from './DegAngleInputNumber.tsx';

export type ActuatorColumnsArgs = {
    yamlDoc: Record<string, unknown> | null;
    serverFieldErrors: Map<string, string[]>;
    outlineBorders: OutlineBorderSet;
    assignableUrdfJoints: string[];
    patchDoc: (next: Record<string, unknown>) => void;
    actuatorIdOnFocusRef: RefObject<Record<number, string>>;
    deleteActuatorAt: (index: number) => void;
    onWarn?: (message: string) => void;
};

export function buildActuatorColumns({
    yamlDoc,
    serverFieldErrors,
    outlineBorders,
    assignableUrdfJoints,
    patchDoc,
    actuatorIdOnFocusRef,
    deleteActuatorAt,
    onWarn,
}: ActuatorColumnsArgs): ColumnsType<ActuatorTableRecord> {
    return [
        {
            title: 'ENABLED',
            key: 'en',
            fixed: 'left' as const,
            width: 70,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'enabled');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, ao, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                    >
                        <Switch
                            className="hardware-config-ant-switch"
                            checked={Boolean(row.enabled)}
                            onChange={(checked) => {
                                if (!yamlDoc) return;
                                const next = structuredClone(yamlDoc);
                                const list = next.actuators as Record<string, unknown>[];
                                list[index] = { ...list[index], enabled: checked };
                                patchDoc(next);
                            }}
                        />
                    </span>
                );
            },
        },
        {
            title: 'ID',
            key: 'id',
            fixed: 'left' as const,
            width: 160,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'id');
                return (
                    <Input
                        size="small"
                        style={{ ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders) }}
                        title={cellTooltipText(serverFieldErrors, ao)}
                        value={String(row.id ?? '')}
                        onFocus={() => {
                            actuatorIdOnFocusRef.current[index] = String(row.id ?? '').trim();
                        }}
                        onChange={(e) => {
                            if (!yamlDoc) return;
                            const next = structuredClone(yamlDoc);
                            const list = next.actuators as Record<string, unknown>[];
                            list[index] = { ...list[index], id: e.target.value };
                            patchDoc(next);
                        }}
                        onBlur={(e) => {
                            if (!yamlDoc) return;
                            const trimmed = e.target.value.trim();
                            const prev = actuatorIdOnFocusRef.current[index] ?? '';
                            const next = structuredClone(yamlDoc);
                            const list = next.actuators as Record<string, unknown>[];
                            list[index] = { ...list[index], id: trimmed };
                            if (prev && trimmed && prev !== trimmed && Array.isArray(next.sensors)) {
                                for (const s of next.sensors as Record<string, unknown>[]) {
                                    if (String(s?.associated_actuator ?? '').trim() === prev) {
                                        s.associated_actuator = trimmed;
                                    }
                                }
                            }
                            patchDoc(next);
                            delete actuatorIdOnFocusRef.current[index];
                        }}
                    />
                );
            },
        },
        {
            title: 'JOINT',
            key: 'urdf_joint',
            width: 220,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'urdf_joint');
                const cur = String(row.urdf_joint ?? '').trim();
                const list = (yamlDoc?.actuators ?? []) as Record<string, unknown>[];
                const used = usedUrdfJointsOnOtherRows(list, index);
                const options = jointSelectOptions(assignableUrdfJoints, used, cur);
                const hasFreePassive = options.some((o) => o.value !== cur);
                const placeholder = hasFreePassive
                    ? 'SELECT PASSIVE URDF JOINT'
                    : 'NO FREE PASSIVE URDF JOINT';
                return (
                    <div title={cellTooltipText(serverFieldErrors, ao)}>
                        <Select
                            size="small"
                            showSearch
                            optionFilterProp="label"
                            style={{
                                width: '100%',
                                minWidth: 180,
                                ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders),
                            }}
                            placeholder={placeholder}
                            value={cur || undefined}
                            options={options}
                            onChange={(j) => {
                                if (!yamlDoc) return;
                                const nextJoint = typeof j === 'string' ? j.trim() : '';
                                const next = structuredClone(yamlDoc);
                                const actuators = next.actuators as Record<string, unknown>[];
                                actuators[index] = { ...actuators[index], urdf_joint: nextJoint };
                                // Keep passive_urdf_joints consistent with the assignment delta:
                                //   - chosen joint leaves the passive pool (it's now mapped),
                                //   - previous joint (if any) re-enters the pool when no row claims it.
                                if (nextJoint) removePassiveUrdfJoint(next, nextJoint);
                                if (cur && cur !== nextJoint) {
                                    appendPassiveUrdfJointIfUnassigned(next, cur);
                                }
                                patchDoc(next);
                            }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'BOARD',
            key: 'board',
            width: 160,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'board');
                const curBoard = String(row.board ?? '');
                const boardIds = yamlDoc ? sortedBoardIds(yamlDoc) : [];
                // Free plug counts (headers + PCA), excluding other rows' claims.
                const boardOptions = boardIds.map((b) => {
                    const free = yamlDoc ? plugChoices(yamlDoc, b, index).length : 0;
                    return {
                        value: b,
                        label: `${b} (${free} free)`,
                    };
                });
                return (
                    <div title={cellTooltipText(serverFieldErrors, ao)}>
                        <Select
                            size="small"
                            style={{
                                width: '100%',
                                ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders),
                            }}
                            value={curBoard || undefined}
                            options={boardOptions}
                            onChange={(boardVal) => {
                                if (!yamlDoc) return;
                                const next = structuredClone(yamlDoc);
                                const actuators = next.actuators as Record<string, unknown>[];
                                const previousPlug = plugValue(actuators[index]);
                                const provisional: Record<string, unknown> = {
                                    ...actuators[index],
                                    board: boardVal,
                                };
                                delete provisional.plug;
                                delete provisional.physical_pin;
                                actuators[index] = provisional;
                                const choices = plugChoices(next, boardVal, index);
                                if (choices.length === 0) {
                                    onWarn?.(
                                        `Board ${boardVal} has no free header or PCA channel.`,
                                    );
                                    return;
                                }
                                const keep =
                                    previousPlug &&
                                    choices.some((choice) => choice.value === previousPlug)
                                        ? previousPlug
                                        : choices[0].value;
                                applyPlugChoice(actuators[index], keep);
                                patchDoc(next);
                            }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'PLUG',
            key: 'plug',
            width: 180,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                if (!yamlDoc) return null;
                const bid = String(row.board ?? '');
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'physical_pin');
                const choices = plugChoices(yamlDoc, bid, index);
                const current = plugValue(row);
                return (
                    <div title={cellTooltipText(serverFieldErrors, ao)}>
                        <Select
                            size="small"
                            style={{
                                width: '100%',
                                ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders),
                            }}
                            aria-label={`plug ${id}`}
                            value={choices.some((choice) => choice.value === current) ? current : undefined}
                            options={choices}
                            onChange={(value) => {
                                const next = structuredClone(yamlDoc);
                                const list = next.actuators as Record<string, unknown>[];
                                applyPlugChoice(list[index], value);
                                patchDoc(next);
                            }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'ACTUATOR_TYPE',
            key: 'servo_type',
            width: 120,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const v = normalizeActuatorType(row.servo_type);
                const ao = actOpts(id, 'servo_type');
                return (
                    <div title={cellTooltipText(serverFieldErrors, ao)}>
                        <Select
                            size="small"
                            style={{ width: 100, ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders) }}
                            value={v}
                            options={[
                                { value: '180', label: '180' },
                                { value: '270', label: '270' },
                                { value: '300', label: '300' },
                            ]}
                            onChange={(val) => {
                                if (!yamlDoc) return;
                                const next = structuredClone(yamlDoc);
                                const list = next.actuators as Record<string, unknown>[];
                                list[index] = { ...list[index], servo_type: val };
                                patchDoc(next);
                            }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'MIN°',
            key: 'min',
            width: 90,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'limit_min');
                const commit = (rad: number) => {
                    if (!yamlDoc) return;
                    const next = structuredClone(yamlDoc);
                    const list = next.actuators as Record<string, unknown>[];
                    list[index] = { ...list[index], limit_min: rad };
                    patchDoc(next);
                };
                return (
                    <DegAngleInputNumber
                        radValue={row.limit_min}
                        onCommitRad={commit}
                        minDeg={0}
                        maxDeg={360}
                        style={cellOutlineStyle(serverFieldErrors, ao, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                    />
                );
            },
        },
        {
            title: 'DEFAULT°',
            key: 'def',
            width: 90,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'default');
                const commit = (rad: number) => {
                    if (!yamlDoc) return;
                    const next = structuredClone(yamlDoc);
                    const list = next.actuators as Record<string, unknown>[];
                    list[index] = { ...list[index], default: rad };
                    patchDoc(next);
                };
                return (
                    <DegAngleInputNumber
                        radValue={row.default}
                        onCommitRad={commit}
                        minDeg={0}
                        maxDeg={360}
                        style={cellOutlineStyle(serverFieldErrors, ao, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                    />
                );
            },
        },
        {
            title: 'MAX°',
            key: 'max',
            width: 90,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'limit_max');
                const commit = (rad: number) => {
                    if (!yamlDoc) return;
                    const next = structuredClone(yamlDoc);
                    const list = next.actuators as Record<string, unknown>[];
                    list[index] = { ...list[index], limit_max: rad };
                    patchDoc(next);
                };
                return (
                    <DegAngleInputNumber
                        radValue={row.limit_max}
                        onCommitRad={commit}
                        minDeg={0}
                        maxDeg={360}
                        style={cellOutlineStyle(serverFieldErrors, ao, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                    />
                );
            },
        },
        {
            title: 'OFFSET°',
            key: 'offset',
            width: 110,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'offset');
                const commit = (rad: number) => {
                    if (!yamlDoc) return;
                    const next = structuredClone(yamlDoc);
                    const list = next.actuators as Record<string, unknown>[];
                    list[index] = { ...list[index], offset: rad };
                    patchDoc(next);
                };
                return (
                    <DegAngleInputNumber
                        radValue={row.offset}
                        onCommitRad={commit}
                        style={cellOutlineStyle(serverFieldErrors, ao, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                    />
                );
            },
        },
        {
            title: 'INVERTED',
            key: 'inverted',
            width: 100,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const d = Number(row.direction);
                const ao = actOpts(id, 'direction');
                const inverted = d === -1;
                return (
                    <Select
                        size="small"
                        style={{ width: 96, ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders) }}
                        value={inverted ? 'yes' : 'no'}
                        title={cellTooltipText(serverFieldErrors, ao)}
                        options={[
                            { value: 'no', label: 'NO' },
                            { value: 'yes', label: 'YES' },
                        ]}
                        onChange={(val) => {
                            if (!yamlDoc) return;
                            const dir = val === 'yes' ? -1 : 1;
                            const next = structuredClone(yamlDoc);
                            const list = next.actuators as Record<string, unknown>[];
                            list[index] = { ...list[index], direction: dir };
                            patchDoc(next);
                        }}
                    />
                );
            },
        },
        {
            title: 'SCALE',
            key: 'scale',
            width: 90,
            render: (_: unknown, record: ActuatorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const ao = actOpts(id, 'scale');
                return (
                    <InputNumber
                        size="small"
                        step={0.01}
                        style={{ width: '100%', ...cellOutlineStyle(serverFieldErrors, ao, outlineBorders) }}
                        value={Number(row.scale)}
                        title={cellTooltipText(serverFieldErrors, ao)}
                        onChange={(val) => {
                            if (!yamlDoc || val == null) return;
                            const next = structuredClone(yamlDoc);
                            const list = next.actuators as Record<string, unknown>[];
                            list[index] = { ...list[index], scale: val };
                            patchDoc(next);
                        }}
                    />
                );
            },
        },
        {
            title: '',
            key: 'del_act',
            fixed: 'right' as const,
            width: 44,
            render: (_: unknown, record: ActuatorTableRecord) => (
                <Popconfirm
                    title="REMOVE ACTUATOR?"
                    description="REMOVES THIS ROW AND LINKED PRESSURE SENSORS"
                    okText="REMOVE"
                    cancelText="CANCEL"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deleteActuatorAt(record.index)}
                >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Remove actuator" />
                </Popconfirm>
            ),
        },
    ];
}
