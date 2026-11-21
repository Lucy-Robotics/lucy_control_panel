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
type Args = { path: string; quality?: string };
type FakeRos = EventEmitter & { idCounter: number; callOnConnection: (m: { id: string; args: Args }) => void };
const handlerFlag = MeshHandler as unknown as { serverTakesQuality: boolean };

function fakeServer(reply: (args: Args) => { result: boolean; values: unknown }) {
    const sent: Args[] = [];
    const ros = new EventEmitter() as FakeRos;
    ros.idCounter = 0;
    ros.callOnConnection = (m: { id: string; args: Args }) => {
        if (sent.length >= 10) throw new Error('runaway retries');
        sent.push(m.args);
        const answer = reply(m.args);
        queueMicrotask(() => ros.emit(m.id, answer));
    };
    (RosBridgeService.getInstance() as unknown as { ros: FakeRos }).ros = ros;
    return sent;
}

const oldServer = (args: Args) => args.quality
    ? { result: false, values: NO_QUALITY }
    : { result: true, values: { success: true, ...PAYLOAD } };

beforeEach(() => { handlerFlag.serverTakesQuality = true; });

test('an old server still serves the first light mesh, retried without quality', async () => {
    const sent = fakeServer(oldServer);
    assert.deepEqual(await MeshHandler.getMesh('a.dae', 'light'), PAYLOAD);
    assert.deepEqual(sent, [{ path: 'a.dae', quality: 'light' }, { path: 'a.dae' }]);
});

test('after the fallback no later call sends quality', async () => {
    const sent = fakeServer(oldServer);
    await MeshHandler.getMesh('a.dae', 'light');
    sent.length = 0;
    await MeshHandler.getMesh('b.dae', 'full');
    await MeshHandler.getMesh('c.dae', 'balanced');
    assert.deepEqual(sent, [{ path: 'b.dae' }, { path: 'c.dae' }]);
});

test('a new server gets quality and unrelated failures stop after 3 attempts', async () => {
    const sent = fakeServer(() => ({ result: false, values: 'boom' }));
    await assert.rejects(MeshHandler.getMesh('a.dae', 'light'), /boom/);
    assert.deepEqual(sent, Array(3).fill({ path: 'a.dae', quality: 'light' }));
});

test('a call without quality never triggers the fallback', async () => {
    const sent = fakeServer(() => ({ result: false, values: NO_QUALITY }));
    await assert.rejects(MeshHandler.getMesh('a.dae'), /does not have a field quality/);
    assert.equal(sent.length, 3);
    assert.equal(handlerFlag.serverTakesQuality, true);
});
