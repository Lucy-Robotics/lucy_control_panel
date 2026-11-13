/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeService } from '../src/Services/theme.service.ts';

const colors = { main: '#101010', secondary: '#202020', highlight: '#00ff41', text: '#f7f1e5' };

test('a picked ghost outline colour is saved in the theme and read back', () => {
    themeService.setThemeColors({ ...colors, ghostOutline: '#ff00aa' });
    assert.equal(themeService.getActiveColors().ghostOutline, '#ff00aa');
});

test('a theme without a ghost outline colour outlines the ghost in its highlight colour', () => {
    themeService.setThemeColors(colors);
    assert.equal(themeService.getActiveColors().ghostOutline, '#00ff41');
});
