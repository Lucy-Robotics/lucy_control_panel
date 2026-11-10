/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../../Constants/robotTypes.ts';
import { ControlModeHandler } from './handlers/ControlMode.handler.ts';
import { JointStateHandler } from './handlers/JointState.handler.ts';

const SEED_DURATION_MS = 100;
const SEED_MARGIN_MS = 200;
const SEED_INTERVAL_MS = 50;
const SEED_GIVE_UP_MS = 5000;

export function takeControlFromCurrentPose(encoderPose: () => JointControlState[]): () => void {
  const control = ControlModeHandler.getInstance();
  if (control.currentControllerId !== '') {
    control.takeControl();
    return () => { };
  }

  const seed = () => JointStateHandler.getInstance().publishJointStates(encoderPose(), SEED_DURATION_MS);
  seed();
  const seeding = setInterval(seed, SEED_INTERVAL_MS);
  const request = setTimeout(() => {
    if (control.currentControllerId === '') control.takeControl();
  }, SEED_DURATION_MS + SEED_MARGIN_MS);
  const giveUp = setTimeout(() => stop(), SEED_GIVE_UP_MS);
  const unsubscribe = control.onControllerChanged(() => stop());

  function stop() {
    clearInterval(seeding);
    clearTimeout(request);
    clearTimeout(giveUp);
    unsubscribe();
  }
  return stop;
}
