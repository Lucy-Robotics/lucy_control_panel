import './withoutMessageChannel.ts';
import { act, render, waitFor } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { fakeRosBridge } from './fakeRosBridge.ts';
import { RobotControlPanel } from '../src/Pages/RobotControlPanel.tsx';
import { ActiveHardwareRosProvider } from '../src/contexts/ActiveHardwareRosContext.tsx';
import { PaginatedCategoriesProvider } from '../src/contexts/PaginatedCategoriesContext.tsx';

const RUNNING = { robot: 'inmoov_urdf', status: 'running', ready: true, index: 8, total: 8, label: 'Running' };
const TWO_ROBOTS = { active: 'inmoov_urdf', available: ['inmoov_urdf', 'marty_urdf'] };

async function renderRunningControlPage() {
    const ros = fakeRosBridge();
    await ros.setConnection('connected');
    const page = await render(React.createElement(PaginatedCategoriesProvider, null,
        React.createElement(ActiveHardwareRosProvider, null, React.createElement(RobotControlPanel))));
    await ros.receive('/lucy/stack_status', RUNNING);
    await ros.receive('/lucy/robots', TWO_ROBOTS);
    const switcher = () => page.container.querySelector<HTMLButtonElement>('.robot-menu-btn');
    await waitFor(() => !!switcher());
    return { ros, page, switcher };
}

const clickMenuItem = async (label: string) => {
    await waitFor(() => !!document.querySelector('.ant-dropdown-menu'));
    const item = [...document.querySelectorAll('.ant-dropdown-menu-item')].find((entry) => entry.textContent === label);
    await act(async () => (item as HTMLElement).click());
};

const clickButton = (text: string) => act(async () => {
    [...document.querySelectorAll('button')].find((button) => button.textContent?.includes(text))!.click();
});

test('the switcher is free while nobody controls and locks while another client does', async () => {
    const { ros, page, switcher } = await renderRunningControlPage();
    assert.equal(switcher()!.disabled, false);

    await ros.receive('/lucy/active_client', 'another-panel');
    assert.equal(switcher()!.disabled, true);

    await ros.receive('/lucy/active_client', '');
    assert.equal(switcher()!.disabled, false);
    await page.unmount();
    await ros.setConnection('disconnected');
});

test('confirming a robot asks the backend for it and shows the starting page', async () => {
    const { ros, page, switcher } = await renderRunningControlPage();
    await act(async () => switcher()!.click());
    await clickMenuItem('Marty');
    await clickButton('Switch to Marty');

    assert.deepEqual(ros.published('/lucy/select_robot'), ['marty_urdf']);
    assert.match(page.container.textContent!, /LUCY IS STARTING…/);
    await page.unmount();
    await ros.setConnection('disconnected');
});
