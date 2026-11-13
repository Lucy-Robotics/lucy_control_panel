/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QuickColorsTab } from '../src/Components/ThemeModal/QuickColorsTab.tsx';
import type { QuickColors } from '../src/Services/theme.service.ts';
import { HIGHLIGHT_COLOR } from '../src/Constants/theme.ts';

const h = React.createElement;

const setInput = async (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
        setter.call(input, value);
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
};

test('the ghost outline colour is picked in Quick Colors, starting from the highlight', async () => {
    const applied: QuickColors[] = [];
    const view = await render(h(QuickColorsTab, {
        activeColors: { main: '#141414', secondary: '#2b3e50', highlight: '#3da5ff', text: '#f7f1e5' },
        onApplyColors: (colors: QuickColors) => applied.push(colors),
    }));
    try {
        const picker = view.container.querySelector('input[title="Pick GHOST OUTLINE"]') as HTMLInputElement;
        assert.equal(picker.value, '#3da5ff', 'with no outline colour the theme highlight is used');
        await setInput(picker, '#ff00aa');
        const apply = [...view.container.querySelectorAll('button')].find((b) => /apply/i.test(b.textContent ?? ''))!;
        await act(async () => apply.click());
        assert.equal(applied.at(-1)?.ghostOutline, '#ff00aa');
        const reset = [...view.container.querySelectorAll('button')].find((b) => /reset/i.test(b.textContent ?? ''))!;
        await act(async () => reset.click());
        assert.equal(applied.at(-1)?.ghostOutline, HIGHLIGHT_COLOR);
    } finally {
        await view.unmount();
    }
});
