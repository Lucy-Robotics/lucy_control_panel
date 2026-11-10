/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook } from './react-harness.ts';
import assert from 'node:assert/strict';
import ROSLIB from 'roslib';

type FakeCall = { op: string; id: string; args?: { dry_run?: boolean } };

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { useActivateConfigureWorkflow } = await import('../src/features/hardwareConfiguration/hooks/useActivateConfigureWorkflow.tsx');

const fakeRos = new ROSLIB.Ros({});
const socket = { onmessage: null as ((event: { data: string }) => void) | null };
Object.assign(fakeRos, { socket });
const fromBridge = (msg: Record<string, unknown>) => socket.onmessage?.({ data: JSON.stringify(msg) });
const linuxHostRun = (id: string) => [
    { op: 'action_feedback', id, values: { phase: 'generate', progress: 1, detail: '' } },
    { op: 'action_feedback', id, values: { phase: 'build', progress: 0, detail: 'skip build: host firmware is prebuilt' } },
    { op: 'action_feedback', id, values: { phase: 'flash', progress: 0, detail: 'skip flash: Linux host firmware (linux_so_arm)' } },
    { op: 'action_feedback', id, values: { phase: 'reload', progress: 0.5, detail: 'reloading' } },
    { op: 'action_result', id, result: true, values: { success: true, message: '', config_name: 'default', boards_flashed: [], errors: [] } },
];
const rp2040Run = (id: string) => [
    { op: 'action_feedback', id, values: { phase: 'build', progress: 0.5, detail: 'compiling' } },
    { op: 'action_feedback', id, values: { phase: 'flash', progress: 0.5, detail: 'flashing rp2040_left_arm' } },
    { op: 'action_result', id, result: true, values: { success: true, message: '', config_name: 'default', boards_flashed: ['rp2040_left_arm'], errors: [] } },
];
let pipelineRun = linuxHostRun;
fakeRos.callOnConnection = (call: FakeCall) => {
    queueMicrotask(() => {
        if (call.op === 'call_service') {
            fakeRos.emit(call.id, { result: true, values: { success: true, message: '', config_yaml: '', config_name: 'default' } });
        } else if (call.op === 'send_action_goal') {
            const messages = call.args?.dry_run
                ? [{ op: 'action_result', id: call.id, result: true, values: { success: true } }]
                : pipelineRun(call.id);
            messages.forEach(fromBridge);
        }
    });
};
const bridge = RosBridgeService.getInstance();
bridge.ros = fakeRos;
(bridge as unknown as { setConnectionStatus(status: string): void }).setConnectionStatus('connected');

const messages: string[] = [];
const messageApi = { error: (m: string) => messages.push(m), warning: (m: string) => messages.push(m), success: () => {}, info: () => {} };
const workflow = await renderHook(() => useActivateConfigureWorkflow({
    messageApi: messageApi as never,
    isConnected: true,
    robotPackageName: 'so_arm101_urdf',
    refetchActiveHardware: async () => ({ ok: true }),
    getPreRunActiveSnapshot: () => null,
}), undefined);

await act(() => workflow.result.current.runActivateWorkflow({
    targetConfigName: 'default',
    boardsToFlash: ['linux_so_arm'],
    buildOnly: false,
    activateOnly: false,
    simulationOnly: false,
    refreshSavedConfigs: async () => {},
}));

const step = (id: string) => workflow.result.current.workflowSteps.find((s: { id: string }) => s.id === id);
assert.deepEqual(messages, [], 'the workflow runs without errors');
assert.deepEqual([step('build')?.status, step('build')?.detail], ['skipped', 'Skipped (host firmware is prebuilt)'], 'a skipped build is shown as skipped');
assert.deepEqual([step('flash')?.status, step('flash')?.detail], ['skipped', 'Skipped (Linux host firmware (linux_so_arm))'], 'a Linux host board shows Flash as skipped, even after the run finishes');
assert.equal(step('reload')?.status, 'done', 'the reload still completes');
assert.equal(workflow.result.current.workflowLastRunSucceeded, true, 'a run with skipped steps succeeds');

pipelineRun = rp2040Run;
await act(() => workflow.result.current.runActivateWorkflow({
    targetConfigName: 'default',
    boardsToFlash: ['rp2040_left_arm'],
    buildOnly: false,
    activateOnly: false,
    simulationOnly: false,
    refreshSavedConfigs: async () => {},
}));
assert.deepEqual([step('build')?.status, step('flash')?.status], ['done', 'done'], 'an rp2040 board still builds and flashes');
await workflow.unmount();

console.log('activate workflow tests passed');
process.exit(0);
