/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { render } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';

const { effortLegendGradient, legendPosition, temperatureLegendGradient } = await import('../src/Utils/colourLegends.ts');
const { effortColor } = await import('../src/Utils/effortArrow.utils.ts');
const { JointEffortDebug } = await import('../src/Components/JointEffortDebug.tsx');

const stops = (gradient: string) => gradient.replace(/^linear-gradient\(to right, |\)$/g, '').split(/, (?=rgb)/);

const temperature = stops(temperatureLegendGradient());
assert.equal(temperature[0], 'rgb(0, 0, 0) 0.0%', 'a cool motor is black on the temperature legend');
assert.equal(temperature.at(-1), 'rgb(219, 0, 0) 100.0%', 'the temperature legend ends on the hard limit red');
assert.ok(temperature.some((stop) => /^rgb\(25\d, 1[0-4]\d, 0\)/.test(stop)), 'the temperature legend passes through orange');
assert.equal(legendPosition(50, 30, 65), '57.1%', 'the 50 °C tick sits where 50 °C is on the bar');

const effort = stops(effortLegendGradient());
assert.equal(effort[0], `${effortColor(0)} 0.0%`, 'the effort legend starts on the no-load colour of the heat map');
assert.equal(effort.at(-1), `${effortColor(0.4)} 100.0%`, 'the effort legend ends on the full-load colour of the heat map');

const debug = await render(React.createElement(JointEffortDebug, { isConnected: false }));
const legends = [...debug.container.querySelectorAll('[role="img"]')].map((legend) => legend.getAttribute('aria-label'));
assert.deepEqual(legends, ['MOTOR TEMPERATURE', 'EFFORT HEAT MAP (LOAD)'], 'debug mode shows both colour legends, even before any reading');
assert.match(debug.container.textContent ?? '', /40 °C.*50 °C.*60 °C/, 'the temperature ticks show the cool, overheat and hard limit points');
await debug.unmount();

console.log('colour legends tests passed');
process.exit(0);
