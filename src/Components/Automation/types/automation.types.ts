/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Node, Edge } from '@xyflow/react';

export type AutomationStepStatus = 'idle' | 'running' | 'completed' | 'error';

export interface WaitNodeData extends Record<string, unknown> {
  label: string;
  duration: number;
  unit: 's' | 'ms';
  description?: string;
  status: AutomationStepStatus;
}

export type MoveMode = 'target' | 'delta' | 'pose';

export interface MoveNodeData extends Record<string, unknown> {
  label: string;
  mode: MoveMode;
  jointName: string;
  targetValue: number;
  deltaValue: number;
  poseId?: string;
  poseName?: string;
  duration?: number;
  status: AutomationStepStatus;
}

export type ResetScope = 'all' | 'category' | 'joint';

export interface ResetNodeData extends Record<string, unknown> {
  label: string;
  scope: ResetScope;
  category?: string;
  jointName?: string;
  status: AutomationStepStatus;
}

export type AutomationNodeData = WaitNodeData | MoveNodeData | ResetNodeData;

export type AutomationNodeType = 'waitNode' | 'moveNode' | 'resetNode';

export type AutomationFlow = {
  id: string;
  name: string;
  description?: string;
  nodes: Node<AutomationNodeData>[];
  edges: Edge[];
  loop: boolean;
};

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  nodeId?: string;
}
