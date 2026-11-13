import { render, act } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CalibrationTeaserPage } from '../src/features/hardwareConfiguration/calibration/CalibrationTeaserPage.tsx';
import { calibrationTeaser } from '../src/features/hardwareConfiguration/calibration/calibrationTeaser.ts';

const Where = () => React.createElement('output', { 'data-testid': 'where' }, useLocation().pathname);

const mount = (message: ReturnType<typeof calibrationTeaser>, onManual = () => {}) =>
    render(
        React.createElement(
            MemoryRouter,
            { initialEntries: ['/robot-configuration'] },
            React.createElement(CalibrationTeaserPage, { teaser: message!, onManualConfiguration: onManual }),
            React.createElement(Where),
        ),
    );

const message = (container: HTMLElement) => container.querySelector('[data-testid=calibration-teaser-message]')!.textContent;

const button = (container: HTMLElement, label: string) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLButtonElement;

test('the teaser message is the big title of the page', async () => {
    const view = await mount(calibrationTeaser('inmoov_urdf', false, false));
    assert.equal(message(view.container), 'Calibration is coming soon for your inmoov !');
    assert.equal(view.container.querySelector('[data-testid=calibration-teaser]')!.getAttribute('data-kind'), 'coming-soon');
    await view.unmount();
});

test('the real hardware teaser carries its own message', async () => {
    const view = await mount(calibrationTeaser('so101_urdf', true, true));
    assert.match(message(view.container)!, /^To calibrate your own so101, restart the stack/);
    await view.unmount();
});

test('Return home goes to the control page', async () => {
    const view = await mount(calibrationTeaser('so101_urdf', true, true));
    await act(async () => button(view.container, 'RETURN HOME').click());
    assert.equal(view.container.querySelector('[data-testid=where]')!.textContent, '/');
    await view.unmount();
});

test('Manual configuration hands over to the manual configuration tab', async () => {
    let opened = 0;
    const view = await mount(calibrationTeaser('so101_urdf', true, true), () => (opened += 1));
    await act(async () => button(view.container, 'MANUAL CONFIGURATION').click());
    assert.equal(opened, 1);
    assert.equal(view.container.querySelector('[data-testid=where]')!.textContent, '/robot-configuration');
    await view.unmount();
});

test('the title uses the primary text colour of the 404 heading, not the highlight green', async () => {
    const view = await mount(calibrationTeaser('so101_urdf', true, true));
    const heading = view.container.querySelector('h1') as HTMLElement;
    assert.equal(heading.style.color, 'var(--color-text-primary)');
    await view.unmount();
});

test('the card is wide enough for the longest teaser to wrap on two lines', async () => {
    const view = await mount(calibrationTeaser('so101_urdf', true, true));
    const card = view.container.querySelector('.hud-corners') as HTMLElement;
    assert.equal(card.style.width, 'min(100%, 760px)');
    await view.unmount();
});
