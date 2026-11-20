import { act, renderHook } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeRosBridge } from './fakeRosBridge.ts';
import { useRobotSelection } from '../src/hooks/useRobotSelection.ts';
import type { StackStatus } from '../src/Utils/stackStatus.ts';

const ROBOTS_TOPIC = '/lucy/robots';
const SELECT_TOPIC = '/lucy/select_robot';
const TWO_ROBOTS = { active: 'inmoov_urdf', available: ['inmoov_urdf', 'marty_urdf'] };

const readyOn = (robot: string): StackStatus => (
    { robot, status: 'running', ready: true, index: 8, total: 8, label: 'Running' }
);

interface Props { isConnected: boolean; status: StackStatus | null }

async function renderSelection(props: Props = { isConnected: true, status: null }) {
    const ros = fakeRosBridge();
    const hook = await renderHook(({ isConnected, status }: Props) => useRobotSelection(isConnected, status), props);
    const select = (robot: string) => act(async () => hook.result.current.selectRobot(robot));
    return { ros, hook, select };
}

test('connecting listens for robots and offers the selection topic', async () => {
    const { ros, hook } = await renderSelection();
    assert.ok(ros.operations().includes(`subscribe ${ROBOTS_TOPIC}`));
    assert.ok(ros.operations().includes(`advertise ${SELECT_TOPIC}`));
    await hook.unmount();
});

test('the installed robots come from the robots topic', async () => {
    const { ros, hook } = await renderSelection();
    await ros.receive(ROBOTS_TOPIC, TWO_ROBOTS);
    assert.deepEqual(hook.result.current.robots, TWO_ROBOTS);
    await hook.unmount();
});

test('a republished robot list keeps the same list, so the page does not re-render', async () => {
    const { ros, hook } = await renderSelection();
    await ros.receive(ROBOTS_TOPIC, TWO_ROBOTS);
    const listed = hook.result.current.robots;
    await ros.receive(ROBOTS_TOPIC, TWO_ROBOTS);
    assert.equal(hook.result.current.robots, listed);
    await hook.unmount();
});

test('selecting a robot asks the backend for it and starts the switch', async () => {
    const { ros, hook, select } = await renderSelection();
    await select('marty_urdf');
    assert.deepEqual(ros.published(SELECT_TOPIC), ['marty_urdf']);
    assert.equal(hook.result.current.switchingTo, 'marty_urdf');
    await hook.unmount();
});

test('only the new robot being ready ends the switch', async () => {
    const { hook, select } = await renderSelection();
    await select('marty_urdf');

    await hook.rerender({ isConnected: true, status: readyOn('inmoov_urdf') });
    assert.equal(hook.result.current.switchingTo, 'marty_urdf');

    await hook.rerender({ isConnected: true, status: readyOn('marty_urdf') });
    assert.equal(hook.result.current.switchingTo, null);
    await hook.unmount();
});

test('dropping the bridge clears the robots and releases their topics', async () => {
    const { ros, hook } = await renderSelection();
    await ros.receive(ROBOTS_TOPIC, TWO_ROBOTS);
    await hook.rerender({ isConnected: false, status: null });
    assert.equal(hook.result.current.robots, null);
    assert.ok(ros.operations().includes(`unsubscribe ${ROBOTS_TOPIC}`));
    assert.ok(ros.operations().includes(`unadvertise ${SELECT_TOPIC}`));
    await hook.unmount();
});

test('the panel reconnects every 2 s while the robot restarts', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const { ros, hook, select } = await renderSelection();
    let reconnects = 0;
    ros.bridge.connect = (async () => { reconnects++; }) as typeof ros.bridge.connect;
    await select('marty_urdf');
    await hook.rerender({ isConnected: false, status: null });

    await act(async () => t.mock.timers.tick(2_000));
    assert.equal(reconnects, 1);
    await hook.unmount();
});

test('a switch times out after 3 minutes and can be dismissed', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const { hook, select } = await renderSelection();
    await select('marty_urdf');

    await act(async () => t.mock.timers.tick(180_000));
    assert.equal(hook.result.current.switchTimedOut, true);

    await act(async () => hook.result.current.dismissSwitch());
    assert.equal(hook.result.current.switchingTo, null);
    await hook.unmount();
});
