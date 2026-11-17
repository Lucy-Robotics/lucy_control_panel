/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awaitControl } from '../src/Utils/awaitControl.ts';

function fakeController() {
    const listeners = new Set<(id: string) => void>();
    return {
        subscribe: (cb: (id: string) => void) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        announce: (id: string) => listeners.forEach((cb) => cb(id)),
        listenerCount: () => listeners.size,
    };
}

test('settles granted once this client becomes the controller', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const controller = fakeController();
    const results: boolean[] = [];
    awaitControl(controller.subscribe, 'me', (granted) => results.push(granted), 10_000);
    controller.announce('someone-else');
    controller.announce('me');
    t.mock.timers.tick(10_000);
    assert.deepEqual(results, [true]);
    assert.equal(controller.listenerCount(), 0);
});

test('settles not granted when control never arrives within the timeout', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const controller = fakeController();
    const results: boolean[] = [];
    awaitControl(controller.subscribe, 'me', (granted) => results.push(granted), 10_000);
    t.mock.timers.tick(9_999);
    assert.deepEqual(results, []);
    t.mock.timers.tick(1);
    assert.deepEqual(results, [false]);
    assert.equal(controller.listenerCount(), 0);
});

test('a cancelled request never settles', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const controller = fakeController();
    const results: boolean[] = [];
    const cancel = awaitControl(controller.subscribe, 'me', (granted) => results.push(granted), 10_000);
    cancel();
    controller.announce('me');
    t.mock.timers.tick(10_000);
    assert.deepEqual(results, []);
});
