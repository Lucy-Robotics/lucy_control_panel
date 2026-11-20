/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { useKeyboardAccept } from '../src/features/hardwareConfiguration/calibration/useKeyboardAccept.ts';

const pressEnter = () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

async function renderStep(onAccept: () => void, onStartOver: () => void) {
    const Step = () => {
        useKeyboardAccept(true, onAccept);
        return React.createElement('button', { 'data-testid': 'start-over', onClick: onStartOver }, 'Start over');
    };
    const view = await render(React.createElement(Step));
    const button = view.container.querySelector('[data-testid="start-over"]') as HTMLButtonElement;
    return { view, button };
}

test('Enter accepts the joint when nothing has the focus', async () => {
    let accepted = 0;
    const { view } = await renderStep(() => { accepted += 1; }, () => {});
    await act(async () => { pressEnter(); });
    assert.equal(accepted, 1);
    await view.unmount();
});

test('a button clicked with the mouse lets go of the focus, so Enter still accepts', async () => {
    let accepted = 0;
    const { view, button } = await renderStep(() => { accepted += 1; }, () => {});
    button.focus();
    await act(async () => {
        button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
    });
    assert.notEqual(document.activeElement, button, 'the clicked button is no longer focused');
    await act(async () => {
        document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    assert.equal(accepted, 1);
    await view.unmount();
});

test('a button reached from the keyboard keeps the focus and its own Enter', async () => {
    let accepted = 0;
    const { view, button } = await renderStep(() => { accepted += 1; }, () => {});
    button.focus();
    await act(async () => {
        button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    });
    assert.equal(document.activeElement, button);
    await act(async () => {
        button.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    assert.equal(accepted, 0, 'the focused button handles Enter itself');
    await view.unmount();
});
