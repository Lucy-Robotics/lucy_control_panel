/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Node, Edge } from '@xyflow/react';
import type { JointControlState } from '../../../Constants/robotTypes';
import type { AutomationFlow, WaitNodeData, MoveNodeData, ResetNodeData } from '../types/automation.types';

export const FALLBACK_LUCY_JOINTS: JointControlState[] = [
  // Head
  { name: 'neck_yaw', displayName: 'Neck Yaw', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 90, type: 'revolute', category: 'Head', restValue: 0, valueInActuatorDegrees: true },
  { name: 'neck_pitch', displayName: 'Neck Pitch', currentValue: 0, targetValue: 0, minValue: -45, maxValue: 45, type: 'revolute', category: 'Head', restValue: 0, valueInActuatorDegrees: true },
  { name: 'head_roll', displayName: 'Head Roll', currentValue: 0, targetValue: 0, minValue: -30, maxValue: 30, type: 'revolute', category: 'Head', restValue: 0, valueInActuatorDegrees: true },

  // Left Arm
  { name: 'left_shoulder_pitch', displayName: 'Left Shoulder Pitch', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 120, type: 'revolute', category: 'Left Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'left_shoulder_roll', displayName: 'Left Shoulder Roll', currentValue: 0, targetValue: 0, minValue: -30, maxValue: 90, type: 'revolute', category: 'Left Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'left_elbow_pitch', displayName: 'Left Elbow Pitch', currentValue: 0, targetValue: 0, minValue: -120, maxValue: 45, type: 'revolute', category: 'Left Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'left_wrist_yaw', displayName: 'Left Wrist Yaw', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 90, type: 'revolute', category: 'Left Arm', restValue: 0, valueInActuatorDegrees: true },

  // Right Arm
  { name: 'right_shoulder_pitch', displayName: 'Right Shoulder Pitch', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 120, type: 'revolute', category: 'Right Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'right_shoulder_roll', displayName: 'Right Shoulder Roll', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 30, type: 'revolute', category: 'Right Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'right_elbow_pitch', displayName: 'Right Elbow Pitch', currentValue: 0, targetValue: 0, minValue: -120, maxValue: 45, type: 'revolute', category: 'Right Arm', restValue: 0, valueInActuatorDegrees: true },
  { name: 'right_wrist_yaw', displayName: 'Right Wrist Yaw', currentValue: 0, targetValue: 0, minValue: -90, maxValue: 90, type: 'revolute', category: 'Right Arm', restValue: 0, valueInActuatorDegrees: true },

  // Torso
  { name: 'torso_yaw', displayName: 'Torso Yaw', currentValue: 0, targetValue: 0, minValue: -60, maxValue: 60, type: 'revolute', category: 'Torso', restValue: 0, valueInActuatorDegrees: true },
  { name: 'torso_pitch', displayName: 'Torso Pitch', currentValue: 0, targetValue: 0, minValue: -30, maxValue: 30, type: 'revolute', category: 'Torso', restValue: 0, valueInActuatorDegrees: true },

  // Grippers
  { name: 'left_gripper', displayName: 'Left Gripper', currentValue: 0, targetValue: 0, minValue: 0, maxValue: 100, type: 'prismatic', category: 'Gripper', restValue: 0, valueInActuatorDegrees: true },
  { name: 'right_gripper', displayName: 'Right Gripper', currentValue: 0, targetValue: 0, minValue: 0, maxValue: 100, type: 'prismatic', category: 'Gripper', restValue: 0, valueInActuatorDegrees: true },
];

export const INITIAL_AUTOMATION_NODES: Node<WaitNodeData | MoveNodeData | ResetNodeData>[] = [
  {
    id: 'node-1',
    type: 'moveNode',
    position: { x: 100, y: 140 },
    data: {
      label: 'Wave Prep: Raise Left Arm',
      mode: 'target',
      jointName: 'left_shoulder_pitch',
      targetValue: 45,
      deltaValue: 0,
      duration: 1.0,
      status: 'idle',
    },
  },
  {
    id: 'node-2',
    type: 'waitNode',
    position: { x: 420, y: 140 },
    data: {
      label: 'Stabilize Hold',
      duration: 1.5,
      unit: 's',
      description: 'Wait for movement stabilization',
      status: 'idle',
    },
  },
  {
    id: 'node-3',
    type: 'moveNode',
    position: { x: 740, y: 140 },
    data: {
      label: 'Wave Action: Nudge Elbow',
      mode: 'delta',
      jointName: 'left_elbow_pitch',
      targetValue: 0,
      deltaValue: -25,
      duration: 0.8,
      status: 'idle',
    },
  },
  {
    id: 'node-4',
    type: 'waitNode',
    position: { x: 1060, y: 140 },
    data: {
      label: 'Short Pause',
      duration: 1.0,
      unit: 's',
      description: 'Pause before resetting',
      status: 'idle',
    },
  },
  {
    id: 'node-5',
    type: 'resetNode',
    position: { x: 1380, y: 140 },
    data: {
      label: 'Return Arm to Rest',
      scope: 'category',
      category: 'Left Arm',
      status: 'idle',
    },
  },
];

export const INITIAL_AUTOMATION_EDGES: Edge[] = [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2', animated: false, style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
  { id: 'edge-2-3', source: 'node-2', target: 'node-3', animated: false, style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
  { id: 'edge-3-4', source: 'node-3', target: 'node-4', animated: false, style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
  { id: 'edge-4-5', source: 'node-4', target: 'node-5', animated: false, style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
];

export const AUTOMATION_PRESETS: AutomationFlow[] = [
  {
    id: 'preset-wave-routine',
    name: 'Arm Wave & Reset',
    description: 'Raises the left arm, pauses, moves elbow, and resets category back to rest.',
    nodes: INITIAL_AUTOMATION_NODES,
    edges: INITIAL_AUTOMATION_EDGES,
    loop: false,
  },
  {
    id: 'preset-head-inspection',
    name: 'Head Sweep & Return',
    description: 'Rotates the neck left and right with timed holds, then resets head joints.',
    nodes: [
      {
        id: 'h-1',
        type: 'moveNode',
        position: { x: 100, y: 120 },
        data: {
          label: 'Look Left 30°',
          mode: 'target',
          jointName: 'neck_yaw',
          targetValue: 30,
          deltaValue: 0,
          duration: 1.0,
          status: 'idle',
        },
      },
      {
        id: 'h-2',
        type: 'waitNode',
        position: { x: 420, y: 120 },
        data: {
          label: 'Inspect Area',
          duration: 2.0,
          unit: 's',
          status: 'idle',
        },
      },
      {
        id: 'h-3',
        type: 'moveNode',
        position: { x: 740, y: 120 },
        data: {
          label: 'Look Right 30°',
          mode: 'target',
          jointName: 'neck_yaw',
          targetValue: -30,
          deltaValue: 0,
          duration: 1.2,
          status: 'idle',
        },
      },
      {
        id: 'h-4',
        type: 'waitNode',
        position: { x: 1060, y: 120 },
        data: {
          label: 'Inspect Area',
          duration: 2.0,
          unit: 's',
          status: 'idle',
        },
      },
      {
        id: 'h-5',
        type: 'resetNode',
        position: { x: 1380, y: 120 },
        data: {
          label: 'Reset Head to Center',
          scope: 'category',
          category: 'Head',
          status: 'idle',
        },
      },
    ],
    edges: [
      { id: 'eh-1-2', source: 'h-1', target: 'h-2', style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
      { id: 'eh-2-3', source: 'h-2', target: 'h-3', style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
      { id: 'eh-3-4', source: 'h-3', target: 'h-4', style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
      { id: 'eh-4-5', source: 'h-4', target: 'h-5', style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
    ],
    loop: false,
  },
  {
    id: 'preset-full-reset',
    name: 'Emergency Rest Calibration',
    description: 'Pauses for safety then commands a full reset of all robot joints.',
    nodes: [
      {
        id: 'r-1',
        type: 'waitNode',
        position: { x: 150, y: 140 },
        data: {
          label: 'Pre-Reset Warning',
          duration: 0.5,
          unit: 's',
          description: 'Short pre-reset delay',
          status: 'idle',
        },
      },
      {
        id: 'r-2',
        type: 'resetNode',
        position: { x: 480, y: 140 },
        data: {
          label: 'Reset Entire Robot',
          scope: 'all',
          status: 'idle',
        },
      },
    ],
    edges: [
      { id: 'er-1-2', source: 'r-1', target: 'r-2', style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 } },
    ],
    loop: false,
  },
];
