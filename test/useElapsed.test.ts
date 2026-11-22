import { render, act, wait } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { useElapsed } from '../src/features/hardwareConfiguration/calibration/useElapsed.ts';

const Probe = ({ running }: { running: boolean }) =>
    React.createElement('output', null, String(useElapsed(running, 60)));

test('useElapsed is false until the delay has passed', async () => {
    const view = await render(React.createElement(Probe, { running: true }));
    assert.equal(view.container.textContent, 'false');
    await act(() => wait(120));
    assert.equal(view.container.textContent, 'true');
    await view.unmount();
});

test('useElapsed never fires while not running', async () => {
    const view = await render(React.createElement(Probe, { running: false }));
    await act(() => wait(120));
    assert.equal(view.container.textContent, 'false');
    await view.unmount();
});
