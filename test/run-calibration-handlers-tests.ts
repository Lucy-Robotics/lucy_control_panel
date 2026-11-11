/*
 * Lucy Control Panel - Calibration Wizard ROS Handler Test Runner
 * Covers Calibration.handler.ts and ControlMode.handler.ts against a mocked
 * rosbridge connection, loaded through a real Vite SSR module graph.
 */

globalThis.window ??= {
    location: { protocol: 'http:', host: 'localhost' },
    addEventListener: () => {},
    removeEventListener: () => {},
} as unknown as Window;
globalThis.localStorage ??= {
    getItem: () => null,
    setItem: () => {},
} as unknown as Storage;

import { createServer, type ViteDevServer } from 'vite';
import ROSLIB from 'roslib';
import type { CalibrationStatus } from '../src/features/hardwareConfiguration/calibration/calibrationModel.ts';
import { createSuite, expectRejection } from './calibrationCheckRunner.ts';

const STATUS_TOPIC = '/lucy/calibration/status';

const { check, report } = createSuite();

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CALIBRATION ROS HANDLER TEST SUITE');
console.log('================================================================\n');

let server: ViteDevServer | undefined;
try {
    server = await createServer({
        server: { middlewareMode: true },
        configFile: './vite.config.ts',
        // antd (and its rc-* deps) ship extensionless deep ESM imports that only
        // resolve through Vite's own resolver, not Node's strict one SSR externals
        // hit. roslib stays external: it's plain CJS and already works that way.
        ssr: { noExternal: [/^antd/, /^rc-/, /^@ant-design\//, '@babel/runtime'] },
    });
    const rosServiceMod = await server.ssrLoadModule('/src/Services/ros/ros.service.ts');
    const calibMod = await server.ssrLoadModule('/src/Services/ros/handlers/Calibration.handler.ts');
    const controlModeMod = await server.ssrLoadModule('/src/Services/ros/handlers/ControlMode.handler.ts');

    type FakeCall = { op: string; id: string; service?: string; topic?: string; args?: unknown; msg?: unknown };
    const fakeRos = new ROSLIB.Ros({});
    let onCall: ((call: FakeCall) => void) | null = null;
    fakeRos.callOnConnection = (call: FakeCall) => onCall?.(call);
    rosServiceMod.RosBridgeService.getInstance().ros = fakeRos;

    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, {
                result: true,
                values: { success: true, error: '', message: 'ok', status_json: '{"phase":"idle"}' },
            }));
        }
    };
    const okResult = await calibMod.CalibrationHandler.command('start');
    check('CalibrationHandler.command resolves with a parsed status on success', okResult.success === true && okResult.status?.phase === 'idle');

    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, { result: false, values: 'adapter is gone' }));
        }
    };
    check('CalibrationHandler.command rejects when the service call fails', await expectRejection(
        calibMod.CalibrationHandler.command('start'),
        'adapter is gone',
    ));

    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, {
                result: true,
                values: { state: 'match', adapter_serial: 'XYZ', matched_config: 'default', config_active: true, control_allowed: true, message: '' },
            }));
        }
    };
    const identity = await calibMod.CalibrationHandler.identity();
    check('CalibrationHandler.identity resolves the raw identity payload', identity.state === 'match' && identity.adapter_serial === 'XYZ');

    rosServiceMod.RosBridgeService.getInstance().ros = null;
    let unsubscribeCalledWithNoRos = false;
    try {
        calibMod.CalibrationHandler.subscribeStatus(() => {})();
        unsubscribeCalledWithNoRos = true;
    } catch {
        unsubscribeCalledWithNoRos = false;
    }
    check('CalibrationHandler.subscribeStatus is a harmless no-op with no ROS connection', unsubscribeCalledWithNoRos);

    rosServiceMod.RosBridgeService.getInstance().ros = fakeRos;
    let receivedStatus: CalibrationStatus | null = null;
    const unsubscribe = calibMod.CalibrationHandler.subscribeStatus((status: CalibrationStatus) => {
        receivedStatus = status;
    });
    fakeRos.emit(STATUS_TOPIC, { data: '{"phase":"review"}' });
    check('CalibrationHandler.subscribeStatus delivers parsed status updates', receivedStatus?.phase === 'review');
    unsubscribe();

    receivedStatus = null;
    fakeRos.emit(STATUS_TOPIC, { data: 'not json' });
    check('CalibrationHandler.subscribeStatus drops unparsable status updates', receivedStatus === null);

    const publishedCalls: FakeCall[] = [];
    onCall = (call) => {
        if (call.op === 'publish') publishedCalls.push(call);
    };
    calibMod.CalibrationHandler.sendTrajectory('/lucy/joint_trajectory', ['rotation'], [1.5], 2.5);
    const traj = publishedCalls.at(-1)?.msg as { points: { time_from_start: { sec: number; nanosec: number } }[] };
    check('CalibrationHandler.sendTrajectory publishes seconds split into sec/nanosec', traj?.points[0].time_from_start.sec === 2 && traj.points[0].time_from_start.nanosec === 500000000);

    publishedCalls.length = 0;
    calibMod.CalibrationHandler.sendTrajectory('', ['rotation'], [1.5], 2.5);
    check('CalibrationHandler.sendTrajectory is a no-op with no topic name', publishedCalls.length === 0);

    publishedCalls.length = 0;
    calibMod.CalibrationHandler.sendTrajectory('/lucy/joint_trajectory', [], [], 2.5);
    check('CalibrationHandler.sendTrajectory is a no-op with no joint names', publishedCalls.length === 0);

    const refusals: string[] = [];

    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, { result: true, values: { success: false, message: 'control_active' } }));
        }
    };
    const handler = controlModeMod.ControlModeHandler.getInstance();
    const stopListening = handler.onControlRefused((reason: string) => refusals.push(reason));
    (handler as unknown as { callControl(acquire: boolean): void }).callControl(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('ControlModeHandler reports the reason when acquiring control is refused', refusals.join() === 'control_active');

    refusals.length = 0;
    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, { result: true, values: { success: true, message: '' } }));
        }
    };
    (handler as unknown as { callControl(acquire: boolean): void }).callControl(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('ControlModeHandler stays quiet when acquiring control succeeds', refusals.length === 0);
    stopListening();
} finally {
    await server?.close();
}

report();
