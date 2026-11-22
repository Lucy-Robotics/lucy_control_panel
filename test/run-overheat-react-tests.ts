/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, renderHook, wait } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';

type FakeCall = { op: string; topic?: string; msg?: { data?: number[] } };
const TORQUE_TOPIC = '/so_arm_torque_enable_controller/commands';
const controllers = [{ topic: '/so_arm_controller/joint_trajectory', joints: ['Pitch', 'Elbow'], defaultCategory: 'Arm' }];

{
    const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
    const { useMotorOverheatGuard } = await import('../src/hooks/useMotorOverheatGuard.ts');
    const { MotorOverheatAlert } = await import('../src/Components/MotorOverheatAlert.tsx');
    const { MotorOverheatContext } = await import('../src/contexts/MotorOverheatContext.ts');

    const calls: FakeCall[] = [];
    const fakeRos = new ROSLIB.Ros({});
    fakeRos.callOnConnection = (call: FakeCall) => calls.push(call);
    RosBridgeService.getInstance().ros = fakeRos;
    const torqueSent = () => calls.filter((c) => c.op === 'publish' && c.topic === TORQUE_TOPIC).map((c) => c.msg?.data);

    let nowMs = 0;
    const realNow = Date.now;
    Date.now = () => nowMs;
    const emitTemperatures = async (atMs: number, pitch: number) => {
        nowMs = atMs;
        fakeRos.emit('/dynamic_joint_states', {
            joint_names: ['Pitch', 'Elbow'],
            interface_values: [
                { interface_names: ['temperature'], values: [pitch] },
                { interface_names: ['temperature'], values: [30] },
            ],
        });
        await act(() => wait(600));
    };

    try {
        const guard = await renderHook(
            ({ holds, connected = true }: { holds: boolean; connected?: boolean }) => useMotorOverheatGuard(connected, holds, controllers),
            { holds: false },
        );
        await emitTemperatures(0, 55);
        await emitTemperatures(3000, 55);
        assert.deepEqual([...guard.result.current.trippedJoints], ['Pitch'], 'a motor whose 3 s median is over 50 °C trips');
        assert.equal(torqueSent().length, 0, 'torque is not touched by a client that does not hold control');

        await guard.rerender({ holds: true });
        assert.deepEqual(torqueSent(), [[0, 1]], 'holding control cuts torque on the hot motor only');

        assert.equal(guard.result.current.canContinue, true, 'a motor under the hard limit may continue');
        await act(async () => guard.result.current.continueWithOverheat());
        assert.equal(guard.result.current.trippedJoints.size, 0, 'continuing clears the trip');
        assert.deepEqual(torqueSent().at(-1), [1, 1], 'continuing gives the torque back');

        const sentBeforeCooling = torqueSent().length;
        await emitTemperatures(6100, 40);
        await emitTemperatures(6200, 40);
        assert.equal(torqueSent().length, sentBeforeCooling, 'torque is not republished while nothing is tripped');

        await emitTemperatures(9300, 62);
        assert.deepEqual(torqueSent().at(-1), [0, 1], 'the hard limit trips again even after continuing');
        assert.equal(guard.result.current.canContinue, false, 'the hard limit cannot be overridden');
        await guard.rerender({ holds: true, connected: false });
        assert.equal(guard.result.current.trippedJoints.size, 0, 'losing the bridge forgets the trips');
        await guard.unmount();
    } finally {
        Date.now = realNow;
    }

    const overheat = (temperatures: [string, number][], tripped: string[], canContinue: boolean, onContinue = () => {}) =>
        React.createElement(
            MotorOverheatContext.Provider,
            { value: { temperatures: new Map(temperatures), trippedJoints: new Set(tripped), canContinue, continueWithOverheat: onContinue } },
            React.createElement(MotorOverheatAlert),
        );

    const quiet = await render(overheat([['Pitch', 55]], [], true));
    assert.equal(quiet.container.innerHTML, '', 'no alert while nothing is tripped');
    await quiet.unmount();

    let continued = 0;
    const hot = await render(overheat([['Pitch', 55]], ['Pitch'], true, () => { continued++; }));
    assert.match(hot.container.textContent ?? '', /Pitch: 55 °C \(limit 50 °C\)/, 'the alert names the hot motor and its temperature');
    await act(async () => hot.container.querySelector('button')!.click());
    assert.equal(continued, 1, 'the continue button continues');
    await hot.rerender(overheat([['Pitch', 45]], ['Pitch'], true));
    assert.match(hot.container.textContent ?? '', /went over 50 °C, back on below 48 °C/, 'a cooled motor says when torque comes back');
    await hot.rerender(overheat([], ['Pitch'], false));
    assert.match(hot.container.textContent ?? '', /Pitch: no reading/, 'a tripped motor that stopped reporting says so');
    await hot.rerender(overheat([['Pitch', 61]], ['Pitch'], false));
    assert.match(hot.container.textContent ?? '', /Hard limit 60 °C reached/, 'the hard limit is spelled out');
    assert.equal(hot.container.querySelector('button'), null, 'no continue button past the hard limit');
    await hot.unmount();

    console.log('overheat React tests passed');
}
