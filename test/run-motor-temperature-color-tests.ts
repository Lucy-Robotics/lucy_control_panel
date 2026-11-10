/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { motorTemperatureRgb } from '../src/Utils/motorTemperatureColor.ts';

const near = (actual: number[], expected: number[], message: string) =>
    assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) < 1e-9), `${message}: got ${actual}`);

near(motorTemperatureRgb(20), [0, 0, 0], 'a cool motor is black');
near(motorTemperatureRgb(40), [0, 0, 0], 'a motor is still black at 40 C');
near(motorTemperatureRgb(45), [0.5, 0.275, 0], 'halfway to the warning it is dark orange');
near(motorTemperatureRgb(50), [1, 0.55, 0], 'a motor at the 50 C warning is orange');
near(motorTemperatureRgb(60), [0.86, 0, 0], 'a motor at the 60 C hard limit is red');
near(motorTemperatureRgb(80), [0.86, 0, 0], 'hotter than the hard limit stays red');
near(motorTemperatureRgb(55), [0.93, 0.275, 0], 'between orange and red it blends');

const grey: [number, number, number] = [0.1, 0.1, 0.1];
near(motorTemperatureRgb(30, grey), grey, 'a cool motor keeps its own colour');
near(motorTemperatureRgb(45, grey), [0.55, 0.325, 0.05], 'warming blends from its own colour to orange');

console.log('motor temperature color: 9 checks passed');
