/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ActuatorTableRecord {
    key: string;
    index: number;
    row: Record<string, unknown>;
}

export interface PressureSensorTableRecord {
    key: string;
    index: number;
    row: Record<string, unknown>;
}

export interface BoardRow {
    key: string;
    boardId: string;
    serial_id: string;
    board_class: string;
    firmware_target: string;
    internalActuatorSlots: number;
    /** Distinct Servo PWM headers claimed by actuators on this board (sensors use Sensor1–6 separately). */
    attachedPins: number;
}
