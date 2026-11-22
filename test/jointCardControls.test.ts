/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import type { JointControlState } from '../src/Constants/robotTypes.ts';
import { JointControl } from '../src/Components/ControlPage/JointControl.tsx';
import { ToggleSwitch } from '../src/Components/ToggleSwitch.tsx';
import { MovableModal } from '../src/Components/MovableModal.tsx';
import { storageService } from '../src/Services/storage.service.ts';

const jaw: JointControlState = {
    name: 'jaw', currentValue: 1.2, targetValue: 1.2, actualValue: 1.0,
    minValue: 0.4, maxValue: 2.6, type: 'revolute', category: 'Head', restValue: 1.6,
};

async function renderJoint(joint: JointControlState) {
    return render(React.createElement(JointControl, { joint, onValueChange: () => {}, showDegrees: true }));
}

test('an inverted joint card says so and draws its slider from the max end', async () => {
    const view = await renderJoint({ ...jaw, inverted: true });
    try {
        assert.match(view.container.textContent ?? '', /inverted/i);
        const handle = view.container.querySelector('.ant-slider-handle') as HTMLElement;
        assert.ok(handle.style.right, 'a reversed slider places its handle from the right');
        assert.equal(handle.style.left, '');
    } finally {
        await view.unmount();
    }
});

test('a normal joint card shows no inverted badge and grows from the left', async () => {
    const view = await renderJoint(jaw);
    try {
        assert.doesNotMatch(view.container.textContent ?? '', /inverted/i);
        const handle = view.container.querySelector('.ant-slider-handle') as HTMLElement;
        assert.ok(handle.style.left);
    } finally {
        await view.unmount();
    }
});

test('a disabled toggle switch ignores clicks on both sides', async () => {
    const toggles: boolean[] = [];
    const view = await render(React.createElement(ToggleSwitch, {
        isOn: true, onToggle: (next: boolean) => toggles.push(next), title: 'Sliders', textOn: 'URDF', textOff: 'SERVO', disabled: true,
    }));
    try {
        const buttons = [...view.container.querySelectorAll('button')];
        assert.equal(buttons.length, 2);
        assert.ok(buttons.every((b) => b.disabled));
        await act(async () => buttons.forEach((b) => b.click()));
        assert.deepEqual(toggles, []);
    } finally {
        await view.unmount();
    }
});

test('an enabled toggle switch reports the side that was clicked', async () => {
    const toggles: boolean[] = [];
    const view = await render(React.createElement(ToggleSwitch, {
        isOn: true, onToggle: (next: boolean) => toggles.push(next), title: 'Sliders', textOn: 'URDF', textOff: 'SERVO',
    }));
    try {
        const [off, on] = [...view.container.querySelectorAll('button')];
        await act(async () => { off.click(); on.click(); });
        assert.deepEqual(toggles, [false, true]);
    } finally {
        await view.unmount();
    }
});

test('a new pose is saved in joint angles, so it can be loaded after a recalibration', async () => {
    const pose = await storageService.savePose('wave', [{ ...jaw, currentValue: 0.7 }]);
    assert.equal(pose.unit, 'joint');
    const stored = await storageService.loadPose(pose.id);
    assert.equal(stored?.unit, 'joint');
    assert.deepEqual(stored?.joints, { jaw: 0.7 });
});

test('dragging or resizing a modal does not start a text selection in its selectable body', async () => {
    const view = await render(React.createElement(MovableModal, {
        modalName: 'drag-test', isVisible: true, onClose: () => {}, header: 'POSES', children: 'body text',
    }));
    try {
        const header = view.container.querySelector('.lucy-movable-modal-header') as HTMLElement;
        const resizeHandle = header.parentElement!.lastElementChild as HTMLElement;
        for (const target of [header, resizeHandle]) {
            const down = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
            await act(async () => { target.dispatchEvent(down); });
            await act(async () => { window.dispatchEvent(new window.MouseEvent('mouseup')); });
            assert.ok(down.defaultPrevented);
        }
    } finally {
        await view.unmount();
    }
});
