/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageInstance } from 'antd/es/message/interface';
import { useCallback } from 'react';
import {
    asMapping,
    defaultNewActuatorRow,
    defaultNewPressureSensorRow,
    newServo2040Board,
} from '../model/documentHelpers.ts';
import { appendPassiveUrdfJointIfUnassigned } from '../model/passiveUrdf.ts';

export interface HardwareConfigMutationsParams {
    yamlDoc: Record<string, unknown> | null;
    patchDoc: (next: Record<string, unknown>) => void;
    messageApi: MessageInstance;
    /**
     * Board ids ordered as in the YAML that still have at least one free
     * physical pin. The new-actuator row is created on the first entry; the
     * user picks a different board (or pin) from the row's BOARD column
     * once the row is in the table.
     */
    boardsEligibleForNewActuator: string[];
    addPressureSensorActuatorId: string | undefined;
}

export function useHardwareConfigMutations({
    yamlDoc,
    patchDoc,
    messageApi,
    boardsEligibleForNewActuator,
    addPressureSensorActuatorId,
}: HardwareConfigMutationsParams) {
    const setBoardSerial = useCallback(
        (boardId: string, serialId: string) => {
            if (!yamlDoc) return;
            const boards = asMapping(yamlDoc.boards);
            const board = boards ? asMapping(boards[boardId]) : null;
            if (!boards || !board) return;
            const next = structuredClone(yamlDoc);
            const nextBoards = asMapping(next.boards);
            const nextBoard = nextBoards ? asMapping(nextBoards[boardId]) : null;
            if (!nextBoards || !nextBoard) return;
            nextBoard.serial_id = serialId;
            nextBoards[boardId] = nextBoard;
            next.boards = nextBoards;
            patchDoc(next);
        },
        [yamlDoc, patchDoc],
    );

    const handleAddBoard = useCallback(
        (boardId: string) => {
            if (!yamlDoc) return;
            const id = boardId.trim();
            const created = newServo2040Board(id);
            if (!created) {
                messageApi.warning('Board id must look like rp2040_left_arm.');
                return;
            }
            const boards = asMapping(yamlDoc.boards) ?? {};
            if (Object.prototype.hasOwnProperty.call(boards, id)) {
                messageApi.warning(`Board ${id} already exists.`);
                return;
            }
            const next = structuredClone(yamlDoc);
            const nextBoards = asMapping(next.boards) ?? {};
            nextBoards[id] = created;
            next.boards = nextBoards;
            patchDoc(next);
            messageApi.success(`Added board ${id}`);
        },
        [yamlDoc, patchDoc, messageApi],
    );

    const handleAttachPca = useCallback(
        (boardId: string, addressText: string) => {
            if (!yamlDoc) return;
            const id = boardId.trim();
            const trimmed = addressText.trim().toLowerCase();
            const address = trimmed.startsWith('0x') ? Number.parseInt(trimmed, 16) : Number(trimmed);
            if (!Number.isInteger(address) || address < 0x40 || address > 0x7f) {
                messageApi.warning('PCA9685 address must be 0x40–0x7F.');
                return;
            }
            const next = structuredClone(yamlDoc);
            const boards = asMapping(next.boards);
            const board = boards ? asMapping(boards[id]) : null;
            if (!boards || !board) {
                messageApi.warning('Pick a board first.');
                return;
            }
            const boardClass = String(board.board_class ?? '');
            // PCA9685 is Servo2040-only; never rewrite bus_servo (Feetech) boards.
            if (boardClass === 'bus_servo_only' || boardClass.startsWith('bus_servo')) {
                messageApi.warning(`Board ${id} is bus-servo; PCA9685 attaches only to Servo2040 boards.`);
                return;
            }
            if (
                boardClass &&
                boardClass !== 'internal_servo_only' &&
                boardClass !== 'internal_servo_i2c_pwm'
            ) {
                messageApi.warning(`Board ${id} (${boardClass}) cannot host a PCA9685.`);
                return;
            }
            const devices = Array.isArray(board.i2c_devices)
                ? [...(board.i2c_devices as Record<string, unknown>[])]
                : [];
            if (devices.some((device) => Number(asMapping(device)?.address) === address)) {
                messageApi.warning(`Address 0x${address.toString(16)} is already on ${id}.`);
                return;
            }
            const deviceId = `pca_${address.toString(16)}`;
            devices.push({ id: deviceId, type: 'pca9685', address, channels: 16 });
            board.i2c_devices = devices;
            board.board_class = 'internal_servo_i2c_pwm';
            boards[id] = board;
            next.boards = boards;
            patchDoc(next);
            messageApi.success(`Attached PCA9685 0x${address.toString(16)} to ${id}`);
        },
        [yamlDoc, patchDoc, messageApi],
    );

    const handleAddActuator = useCallback(
        (preferredBoardId?: string) => {
            if (!yamlDoc) return;
            const preferred = preferredBoardId?.trim() ?? '';
            const targetBoard =
                preferred && boardsEligibleForNewActuator.includes(preferred)
                    ? preferred
                    : boardsEligibleForNewActuator[0];
            if (!targetBoard) {
                messageApi.warning(
                    preferred
                        ? `No free header or PCA channel on ${preferred}.`
                        : 'No board has a free header or PCA channel.',
                );
                return;
            }
            const row = defaultNewActuatorRow(yamlDoc, targetBoard);
            if (!row) {
                messageApi.warning('No free header or PCA channel on that board.');
                return;
            }
            const next = structuredClone(yamlDoc);
            if (!Array.isArray(next.actuators)) next.actuators = [];
            (next.actuators as Record<string, unknown>[]).push(row);
            patchDoc(next);
            messageApi.success(`Added actuator "${String(row.id)}" on ${targetBoard}`);
        },
        [yamlDoc, boardsEligibleForNewActuator, patchDoc, messageApi],
    );

    const handleAddPressureSensor = useCallback(() => {
        if (!yamlDoc || !addPressureSensorActuatorId) return;
        const row = defaultNewPressureSensorRow(yamlDoc, addPressureSensorActuatorId);
        if (!row) {
            messageApi.warning('Could not add sensor — pick an actuator on a board with a free pin.');
            return;
        }
        const next = structuredClone(yamlDoc);
        if (!Array.isArray(next.sensors)) next.sensors = [];
        (next.sensors as Record<string, unknown>[]).push(row);
        patchDoc(next);
        messageApi.success(`Added pressure sensor "${String(row.id)}"`);
    }, [yamlDoc, addPressureSensorActuatorId, patchDoc, messageApi]);

    const deleteActuatorAt = useCallback(
        (index: number) => {
            if (!yamlDoc || !Array.isArray(yamlDoc.actuators)) return;
            const list = yamlDoc.actuators as Record<string, unknown>[];
            if (index < 0 || index >= list.length) return;
            const row = list[index];
            const aid = String(row?.id ?? '').trim();
            const removedJoint = String(row?.urdf_joint ?? '').trim();
            const next = structuredClone(yamlDoc);
            const actuators = next.actuators as Record<string, unknown>[];
            actuators.splice(index, 1);
            if (aid && Array.isArray(next.sensors)) {
                next.sensors = (next.sensors as Record<string, unknown>[]).filter(
                    (s) => String(s?.associated_actuator ?? '').trim() !== aid,
                );
            }
            appendPassiveUrdfJointIfUnassigned(next, removedJoint);
            patchDoc(next);
            messageApi.success('Actuator removed');
        },
        [yamlDoc, patchDoc, messageApi],
    );

    const deletePressureSensorAt = useCallback(
        (index: number) => {
            if (!yamlDoc || !Array.isArray(yamlDoc.sensors)) return;
            const list = yamlDoc.sensors as Record<string, unknown>[];
            if (index < 0 || index >= list.length) return;
            const row = asMapping(list[index]);
            if (!row || String(row.type ?? '').trim() !== 'pressure') {
                messageApi.warning('Can only remove pressure sensors from this table.');
                return;
            }
            const sid = String(row.id ?? '').trim();
            const next = structuredClone(yamlDoc);
            const sensors = next.sensors as Record<string, unknown>[];
            sensors.splice(index, 1);
            patchDoc(next);
            messageApi.success(sid ? `Removed sensor "${sid}"` : 'Pressure sensor removed');
        },
        [yamlDoc, patchDoc, messageApi],
    );

    return {
        setBoardSerial,
        handleAddBoard,
        handleAttachPca,
        handleAddActuator,
        handleAddPressureSensor,
        deleteActuatorAt,
        deletePressureSensorAt,
    };
}
