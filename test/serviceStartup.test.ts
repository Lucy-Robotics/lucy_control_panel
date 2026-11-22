import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    callOnceServiceIsUp,
    SERVICE_STARTUP_STEP_MS,
    SERVICE_STARTUP_WAIT_MS,
} from '../src/Utils/serviceStartup.ts';

const missing = () => new Error('Service /config/get does not exist');

function harness() {
    const delays: number[] = [];
    const sleep = async (ms: number) => { delays.push(ms); };
    return { delays, sleep };
}

test('a service that appears after a few tries returns its result, waiting one step between tries', async () => {
    const { delays, sleep } = harness();
    let calls = 0;
    const result = await callOnceServiceIsUp(async () => {
        if (++calls < 4) throw missing();
        return 'config';
    }, sleep);
    assert.equal(result, 'config');
    assert.equal(calls, 4);
    assert.deepEqual(delays, [SERVICE_STARTUP_STEP_MS, SERVICE_STARTUP_STEP_MS, SERVICE_STARTUP_STEP_MS]);
});

test('any other error is thrown at once, no wait', async () => {
    for (const message of ['Service /config/get timed out after 5000ms', 'ROS bridge is not connected.']) {
        const { delays, sleep } = harness();
        let calls = 0;
        await assert.rejects(
            callOnceServiceIsUp(async () => { calls++; throw new Error(message); }, sleep),
            { message },
        );
        assert.equal(calls, 1, message);
        assert.deepEqual(delays, [], message);
    }
});

test('a service still missing after SERVICE_STARTUP_WAIT_MS throws the missing-service error, after exactly WAIT/STEP + 1 calls', async () => {
    const { delays, sleep } = harness();
    let calls = 0;
    await assert.rejects(
        callOnceServiceIsUp(async () => { calls++; throw missing(); }, sleep),
        { message: 'Service /config/get does not exist' },
    );
    assert.equal(calls, SERVICE_STARTUP_WAIT_MS / SERVICE_STARTUP_STEP_MS + 1);
    assert.equal(delays.length, SERVICE_STARTUP_WAIT_MS / SERVICE_STARTUP_STEP_MS);
});
