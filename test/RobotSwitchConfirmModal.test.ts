import { act, render } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { RobotSwitchConfirmModal } from '../src/Components/ControlPage/RobotSwitchConfirmModal.tsx';

async function renderModal(robotPackage: string | null) {
    const answers: string[] = [];
    const view = await render(React.createElement(RobotSwitchConfirmModal, {
        robotPackage,
        onConfirm: (robot: string) => answers.push(`confirm ${robot}`),
        onCancel: () => answers.push('cancel'),
    }));
    return { ...view, answers };
}

const clickButton = (text: string) => act(async () => {
    [...document.querySelectorAll('button')].find((button) => button.textContent?.includes(text))!.click();
});

test('no confirmation is shown without a chosen robot', async () => {
    const view = await renderModal(null);
    assert.doesNotMatch(document.body.textContent!, /Lucy restarts on this robot/);
    await view.unmount();
});

test('the confirmation names the robot and warns about the restart', async () => {
    const view = await renderModal('marty_urdf');
    assert.match(document.body.textContent!, /Switch to Marty\? Lucy restarts on this robot\./);
    await view.unmount();
});

test('confirming passes the chosen robot on', async () => {
    const view = await renderModal('marty_urdf');
    await clickButton('Switch to Marty');
    assert.deepEqual(view.answers, ['confirm marty_urdf']);
    await view.unmount();
});

test('cancelling closes without switching', async () => {
    const view = await renderModal('marty_urdf');
    await clickButton('Cancel');
    assert.deepEqual(view.answers, ['cancel']);
    await view.unmount();
});
