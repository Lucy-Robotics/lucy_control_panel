import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rosBridgeHttpUrl, rosBridgeReachable } from '../src/Services/ros/rosBridgeProbe.ts';

const ORIGIN = 'https://lucy.local:4004';

function stubFetch(result: Response | Error): string[] {
    const calls: string[] = [];
    globalThis.fetch = (async (input: string) => {
        calls.push(input);
        if (result instanceof Error) throw result;
        return result;
    }) as typeof fetch;
    return calls;
}

test('websocket urls are probed over http', () => {
    assert.equal(rosBridgeHttpUrl('wss://lucy.local:4004/rosbridge'), 'https://lucy.local:4004/rosbridge');
    assert.equal(rosBridgeHttpUrl('ws://10.0.0.2:9090'), 'http://10.0.0.2:9090');
});

test('rosbridge refusing a plain GET means it is up', async () => {
    const calls = stubFetch(new Response('', { status: 400 }));
    assert.equal(await rosBridgeReachable('wss://lucy.local:4004/rosbridge', ORIGIN), true);
    assert.deepEqual(calls, ['https://lucy.local:4004/rosbridge']);
});

test('a proxy error means rosbridge is not up yet', async () => {
    stubFetch(new Response('', { status: 500 }));
    assert.equal(await rosBridgeReachable('wss://lucy.local:4004/rosbridge', ORIGIN), false);
});

test('an unreachable host means rosbridge is not up yet', async () => {
    stubFetch(new TypeError('NetworkError'));
    assert.equal(await rosBridgeReachable('ws://10.0.0.2:9090', ORIGIN), false);
});
