/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NodeTypes } from '@xyflow/react';
import { WaitNode } from './WaitNode';
import { MoveNode } from './MoveNode';
import { ResetNode } from './ResetNode';

export const nodeTypes: NodeTypes = {
  waitNode: WaitNode,
  moveNode: MoveNode,
  resetNode: ResetNode,
};
