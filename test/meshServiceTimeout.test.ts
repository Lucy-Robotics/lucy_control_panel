/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { beforeEach, test } from 'node:test';
import './react-harness.ts';
import { RosBridgeService } from '../src/Services/ros/ros.service.ts';

const { MeshHandler } = await import('../src/Services/ros/handlers/Mesh.handler.ts');

const NO_QUALITY = 'Message type lucy_msgs/GetMesh_Request does not have a field quality';
const PAYLOAD = { data: 'abc', encoding: 'glb_base64' };
type Msg = { id: string; timeout: number };
type FakeRos = EventEmitter & { idCounter: number; callOnConnection: (m: Msg) => void };
const handlerFlag = MeshHandler as unknown as { serverTakesQuality: boolean };

/** Replies are consumed in order; returns the rosbridge timeout of each call. */
function fakeServer(replies: { result: boolean; values: unknown }[]) {
    const timeouts: number[] = [];
    const ros = new EventEmitter() as FakeRos;
    ros.idCounter = 0;
    ros.callOnConnection = (m) => {
        if (timeouts.length >= 10) throw new Error('runaway retries');
        timeouts.push(m.timeout);
        const answer = replies[timeouts.length - 1];
        if (!answer) throw new Error('unexpected extra call');
        queueMicrotask(() => ros.emit(m.id, answer));
    };
    (RosBridgeService.getInstance() as unknown as { ros: FakeRos }).ros = ros;
    return timeouts;
}

const fail = { result: false, values: 'boom' };
const ok = { result: true, values: { success: true, ...PAYLOAD } };

beforeEach(() => { handlerFlag.serverTakesQuality = true; });

test('the first mesh/get call asks rosbridge for 3 s', async () => {
    const timeouts = fakeServer([ok]);
    await MeshHandler.getMesh('a.glb');
    assert.deepEqual(timeouts, [3]);
});

test('a failed first reply is retried with a 10 s rosbridge timeout', async () => {
    const timeouts = fakeServer([fail, ok]);
    assert.deepEqual(await MeshHandler.getMesh('a.glb'), PAYLOAD);
    assert.deepEqual(timeouts, [3, 10]);
});

test('three failures reject with timeouts 3, 10, 10', async () => {
    const timeouts = fakeServer([fail, fail, fail]);
    await assert.rejects(MeshHandler.getMesh('a.glb'), /boom/);
    assert.deepEqual(timeouts, [3, 10, 10]);
});

test('the quality fallback retry still serves the mesh but uses up the 3 s attempt', async () => {
    const timeouts = fakeServer([{ result: false, values: NO_QUALITY }, ok]);
    assert.deepEqual(await MeshHandler.getMesh('a.dae', 'light'), PAYLOAD);
    assert.deepEqual(timeouts, [3, 10]);
});
