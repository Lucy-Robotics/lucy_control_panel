/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Stands in for the real CalibrationRobotPreview (a react-three-fiber Canvas), aliased
 * in via Vite so the wizard's own render-phase logic can be exercised in this Node test
 * harness without a browser WebGL context. CalibrationRobotPreview's own logic is
 * covered separately, directly, in its own test section.
 */
export const CalibrationRobotPreview = () => null;
