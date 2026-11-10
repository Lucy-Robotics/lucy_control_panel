/*
 * Lucy Control Panel - Calibration Wizard Test Runner
 * Covers the pure wizard model and the ROS handlers it drives.
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
import * as model from '../src/features/hardwareConfiguration/calibration/calibrationModel.ts';

const STATUS_TOPIC = '/lucy/calibration/status';

let passCount = 0;
let failCount = 0;

function check(label: string, condition: boolean): void {
    if (condition) {
        console.log(`✓ [PASS] ${label}`);
        passCount++;
    } else {
        console.error(`✗ [FAIL] ${label}`);
        failCount++;
    }
}

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

async function expectRejection(promise: Promise<unknown>, messageContains: string): Promise<boolean> {
    try {
        await promise;
        return false;
    } catch (e) {
        return e instanceof Error && e.message.includes(messageContains);
    }
}

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CALIBRATION WIZARD VERIFICATION SUITE');
console.log('================================================================\n');

console.log('[SECTION 1] calibrationModel.ts (pure wizard logic)');
console.log('----------------------------------------------------------------');

check('parseStatus parses a valid status payload', deepEqual(
    model.parseStatus('{"phase":"joints","message":"go"}'),
    { ...model.EMPTY_STATUS, phase: 'joints', message: 'go' },
));
check('parseStatus rejects malformed JSON', model.parseStatus('{not json') === null);
check('parseStatus rejects a bare JSON number', model.parseStatus('42') === null);

check('wizardStepIndex: mid_pose is step 1', model.wizardStepIndex('mid_pose') === 1);
check('wizardStepIndex: joints is step 2', model.wizardStepIndex('joints') === 2);
check('wizardStepIndex: review is step 3', model.wizardStepIndex('review') === 3);
check('wizardStepIndex: applied is step 4', model.wizardStepIndex('applied') === 4);
check('wizardStepIndex: verify_drive is step 4', model.wizardStepIndex('verify_drive') === 4);
check('wizardStepIndex: idle falls back to step 0', model.wizardStepIndex('idle') === 0);
check('wizardStepIndex: unsupported falls back to step 0', model.wizardStepIndex('unsupported') === 0);

check('requiredHealthOk is false with no checks at all', model.requiredHealthOk([]) === false);
check('requiredHealthOk is true when every required check passes', model.requiredHealthOk([
    { id: 'a', required: true, ok: true, label: 'A' },
    { id: 'b', required: false, ok: false, label: 'B' },
]) === true);
check('requiredHealthOk is false when a required check fails', model.requiredHealthOk([
    { id: 'a', required: true, ok: false, label: 'A' },
]) === false);

const joints: model.CalibrationJoint[] = [
    { name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 },
    { name: 'elbow', min_span: 100, full_turn: false, ticks: 20 },
];
check('nextJoint returns the first unaccepted joint', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: {},
})?.name === 'shoulder_pan');
check('nextJoint skips joints already accepted', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: { shoulder_pan: [0, 1] },
})?.name === 'elbow');
check('nextJoint is null once every joint is accepted', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: { shoulder_pan: [0, 1], elbow: [0, 1] },
}) === null);

const barWithRange = model.rangeBar([1000, 3000], 2000, 1500);
check('rangeBar computes left/width from the recorded range', barWithRange.left > 0 && barWithRange.width > 0);
check('rangeBar marks a wide-enough sweep as enough', barWithRange.enough === true);
check('rangeBar marks a too-narrow sweep as not enough', model.rangeBar([1000, 1100], 1050, 1500).enough === false);
const barNoRange = model.rangeBar(null, null, 100);
check('rangeBar with no range centers on the half-turn tick and has no span', barNoRange.span === 0 && barNoRange.tick === null);

check('demoAngle starts at the midpoint at t=0', Math.abs(model.demoAngle(0, -1, 1) - 0) < 1e-9);
check('demoAngle is periodic', Math.abs(model.demoAngle(0, -1, 1, 4) - model.demoAngle(4, -1, 1, 4)) < 1e-9);

for (const state of model.IDENTITY_NEEDS_WIZARD) {
    check(`bootRoute sends identity state "${state}" to the wizard`, model.bootRoute({
        state,
        adapter_serial: '',
        matched_config: '',
        config_active: false,
        control_allowed: false,
        message: '',
    }) === 'wizard');
}
check('bootRoute sends a matched, inactive config to activate', model.bootRoute({
    state: 'match',
    adapter_serial: 'ABC',
    matched_config: 'default',
    config_active: false,
    control_allowed: true,
    message: '',
}) === 'activate');
check('bootRoute leaves a matched, active config alone', model.bootRoute({
    state: 'match',
    adapter_serial: 'ABC',
    matched_config: 'default',
    config_active: true,
    control_allowed: true,
    message: '',
}) === 'none');

check('readableError passes a plain string through', model.readableError('boom') === 'boom');
check('readableError extracts the message field from a JSON error', model.readableError('{"message":"span_too_small"}') === 'span_too_small');
check('readableError falls back to the raw text when JSON has no message', model.readableError('{"code":"x"}') === '{"code":"x"}');
check('readableError falls back to the raw text on malformed JSON', model.readableError('{not json') === '{not json');

check('errorHint knows span_too_small', model.errorHint('span_too_small').length > 0);
check('errorHint is blank for an unknown code', model.errorHint('something_else') === '');

console.log('\n[SECTION 2] Calibration.handler.ts (ROS transport, mocked bridge)');
console.log('----------------------------------------------------------------');

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
    let receivedStatus: model.CalibrationStatus | null = null;
    const unsubscribe = calibMod.CalibrationHandler.subscribeStatus((status: model.CalibrationStatus) => {
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

    console.log('\n[SECTION 3] ControlMode.handler.ts (Control Robot refusal toast)');
    console.log('----------------------------------------------------------------');

    const warnings: string[] = [];
    const antd = await server.ssrLoadModule('antd');
    const originalWarning = antd.message.warning;
    antd.message.warning = (msg: string) => warnings.push(msg);

    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, { result: true, values: { success: false, message: 'control_active' } }));
        }
    };
    const handler = controlModeMod.ControlModeHandler.getInstance();
    (handler as unknown as { callControl(acquire: boolean): void }).callControl(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('ControlModeHandler warns when acquiring control is refused', warnings.some((w) => w.includes('control_active')));

    warnings.length = 0;
    onCall = (call) => {
        if (call.op === 'call_service') {
            queueMicrotask(() => fakeRos.emit(call.id, { result: true, values: { success: true, message: '' } }));
        }
    };
    (handler as unknown as { callControl(acquire: boolean): void }).callControl(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    check('ControlModeHandler stays quiet when acquiring control succeeds', warnings.length === 0);

    antd.message.warning = originalWarning;
} finally {
    await server?.close();
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed (${passCount + failCount} total)`);
console.log('================================================================\n');

if (failCount > 0) {
    process.exit(1);
}
