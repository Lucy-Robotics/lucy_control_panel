/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../../Constants/robotTypes.ts';
import { ControlModeHandler } from './handlers/ControlMode.handler.ts';
import { COMMAND_DURATION_MS, JointStateHandler } from './handlers/JointState.handler.ts';

const SEED_MARGIN_MS = 200;

export function takeControlFromCurrentPose(joints: JointControlState[]): () => void {
  const control = ControlModeHandler.getInstance();
  if (control.currentControllerId !== '') {
    control.takeControl();
    return () => { };
  }

  JointStateHandler.getInstance().publishJointStates(joints);
  const timer = setTimeout(() => {
    if (control.currentControllerId === '') control.takeControl();
  }, COMMAND_DURATION_MS + SEED_MARGIN_MS);
  return () => clearTimeout(timer);
}
