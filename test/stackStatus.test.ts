import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_STAGES, panelProgress, type StackStatus } from '../src/Utils/stackStatus.ts';

const loading = (index: number): StackStatus => ({
    robot: 'inmoov_urdf', status: 'loading', ready: false, index, total: CORE_STAGES.length, label: CORE_STAGES[index - 1],
});

test('the panel lists only the stages it can hear about, after the rosbridge port opens', () => {
    const { titles } = panelProgress(loading(5), true);
    assert.deepEqual(titles, ['Connecting to the ROS bridge', ...CORE_STAGES.slice(3)]);
});

test('the first stage after the port is the first step after connecting', () => {
    assert.deepEqual(panelProgress(loading(4), true), {
        titles: ['Connecting to the ROS bridge', ...CORE_STAGES.slice(3)],
        current: 1,
        percent: 0,
        counter: '1/5',
    });
});

test('the last stage counts the visible stages only', () => {
    const { current, percent, counter } = panelProgress(loading(8), true);
    assert.deepEqual([current, percent, counter], [5, 80, '5/5']);
});

test('before the bridge connects, connecting is the current step', () => {
    assert.deepEqual(panelProgress(null, false).current, 0);
});
