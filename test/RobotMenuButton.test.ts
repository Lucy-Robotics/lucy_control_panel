import './withoutMessageChannel.ts';
import { act, render, waitFor } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { RobotMenuButton } from '../src/Components/ControlPage/RobotMenuButton.tsx';

const TWO_ROBOTS = { active: 'inmoov_urdf', available: ['inmoov_urdf', 'marty_urdf'] };

async function renderButton(props: Partial<React.ComponentProps<typeof RobotMenuButton>> = {}) {
    const picked: string[] = [];
    const view = await render(React.createElement(RobotMenuButton, {
        robotPackage: 'inmoov_urdf',
        robots: TWO_ROBOTS,
        switchingTo: null,
        blockedReason: null,
        onSelect: (robot: string) => picked.push(robot),
        ...props,
    }));
    const button = view.container.querySelector('button')!;
    return { ...view, button, picked };
}

test('the switcher is disabled when no other robot is installed', async () => {
    const view = await renderButton({ robots: { active: 'inmoov_urdf', available: ['inmoov_urdf'] } });
    assert.ok(view.button.disabled);
    await view.unmount();
});

test('the switcher is disabled while a reason blocks the switch', async () => {
    const view = await renderButton({ blockedReason: 'Turn CONTROL off to switch robot' });
    assert.ok(view.button.disabled);
    await view.unmount();
});

test('the switcher names the target robot and spins while switching', async () => {
    const view = await renderButton({ switchingTo: 'marty_urdf', blockedReason: 'Switching to Marty…' });
    assert.match(view.button.textContent!, /Marty/);
    assert.ok(view.button.querySelector('.anticon-loading'));
    await view.unmount();
});

test('choosing a robot from the open menu selects it', async () => {
    const view = await renderButton();
    await act(async () => view.button.click());
    assert.ok(await waitFor(() => !!document.querySelector('.ant-dropdown-menu')));

    const marty = [...document.querySelectorAll('.ant-dropdown-menu-item')].find((item) => item.textContent === 'Marty');
    await act(async () => (marty as HTMLElement).click());

    assert.deepEqual(view.picked, ['marty_urdf']);
    await view.unmount();
});
