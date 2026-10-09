/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { EdgeTypes } from '@xyflow/react';
import { DeletableEdge } from './DeletableEdge';

export const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge,
  default: DeletableEdge,
};
