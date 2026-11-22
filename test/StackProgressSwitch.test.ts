import { act, render } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { StackProgress } from '../src/Components/ControlPage/StackProgress.tsx';
import type { StackStatus } from '../src/Utils/stackStatus.ts';

const stage = (robot: string, status: StackStatus['status'], index: number, label: string): StackStatus => (
    { robot, status, ready: false, index, total: 8, label }
);

async function renderSwitchProgress(props: Partial<React.ComponentProps<typeof StackProgress>>) {
    const dismissed: boolean[] = [];
    const view = await render(React.createElement(StackProgress, {
        target: 'marty_urdf',
        robot: 'inmoov_urdf',
        status: null,
        isConnected: true,
        timedOut: false,
        connectButton: false,
        onDismiss: () => dismissed.push(true),
        ...props,
    }));
    return { ...view, text: view.container.textContent!, dismissed };
}

test('the page names the robot being switched to', async () => {
    const view = await renderSwitchProgress({});
    assert.match(view.text, /ROBOT: MARTY/);
    await view.unmount();
});

test('stages of the robot being left are not shown as progress', async () => {
    const view = await renderSwitchProgress({ status: stage('inmoov_urdf', 'loading', 6, 'Building robot model') });
    assert.doesNotMatch(view.text, /3\/5/);
    await view.unmount();
});

test('a crash during the switch is reported and can be dismissed', async () => {
    const view = await renderSwitchProgress({ status: stage('marty_urdf', 'crashed', 8, 'Activating controllers') });
    assert.match(view.text, /Lucy crashed \(Activating controllers\)\. Check the Lucy TUI\./);

    const dismiss = [...view.container.querySelectorAll('button')].find((button) => button.textContent === 'Dismiss');
    await act(async () => dismiss!.click());
    assert.deepEqual(view.dismissed, [true]);
    await view.unmount();
});

test('a switch that never finishes is reported', async () => {
    const view = await renderSwitchProgress({ timedOut: true });
    assert.match(view.text, /still not ready after 3 minutes/);
    await view.unmount();
});
