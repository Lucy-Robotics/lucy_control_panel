/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

const { parseMeshQualitySetting, resolveMeshQuality } = await import('../src/hooks/useMeshQuality.ts');

test('unknown stored values fall back to auto and known ones are kept', () => {
    for (const bad of [null, '', 'ultra', 'AUTO', 'Full']) assert.equal(parseMeshQualitySetting(bad), 'auto');
    for (const good of ['full', 'balanced', 'light'] as const) assert.equal(parseMeshQualitySetting(good), good);
});

test('auto picks light on a software renderer and full on a real GPU', () => {
    assert.equal(resolveMeshQuality('auto', 'ANGLE (Google, Vulkan (SwiftShader Device))'), 'light');
    assert.equal(resolveMeshQuality('auto', 'llvmpipe (LLVM 15.0.7, 256 bits)'), 'light');
    assert.equal(resolveMeshQuality('auto', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)'), 'full');
    assert.equal(resolveMeshQuality('auto', null), 'full');
});

test('an explicit quality wins over the renderer', () => {
    assert.equal(resolveMeshQuality('full', 'SwiftShader'), 'full');
    assert.equal(resolveMeshQuality('balanced', 'SwiftShader'), 'balanced');
    assert.equal(resolveMeshQuality('light', 'NVIDIA GeForce'), 'light');
});
