import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuProps } from 'antd';
import { robotSwitchMenu } from '../src/Utils/robotSwitchMenu.ts';

const ROBOTS = { active: 'inmoov_urdf', available: ['inmoov_urdf', 'marty_urdf'] };

const click = (menu: MenuProps, key: string) => menu.onClick!({ key } as Parameters<NonNullable<MenuProps['onClick']>>[0]);

test('the menu lists every installed robot by name', () => {
    const items = robotSwitchMenu(ROBOTS, () => {}).items!.slice(1);
    assert.deepEqual(items.map((item) => (item as { label: string }).label), ['InMoov', 'Marty']);
});

test('the active robot is shown as selected', () => {
    assert.deepEqual(robotSwitchMenu(ROBOTS, () => {}).selectedKeys, ['inmoov_urdf']);
});

test('picking the active robot does nothing', () => {
    const picked: string[] = [];
    click(robotSwitchMenu(ROBOTS, (robot) => picked.push(robot)), 'inmoov_urdf');
    assert.deepEqual(picked, []);
});

test('picking another robot selects it', () => {
    const picked: string[] = [];
    click(robotSwitchMenu(ROBOTS, (robot) => picked.push(robot)), 'marty_urdf');
    assert.deepEqual(picked, ['marty_urdf']);
});
