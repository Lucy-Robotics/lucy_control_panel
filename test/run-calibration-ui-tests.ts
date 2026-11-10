/*
 * Lucy Control Panel - Calibration Wizard UI Test Runner
 * Covers the wizard's presentational layer: CalibrationWizard's phase rendering,
 * the small presentational components it composes, and the pure helpers inside
 * CalibrationRobotPreview. The 3D preview itself (a react-three-fiber Canvas) needs
 * a browser WebGL context this Node harness doesn't have, so it is aliased out when
 * rendering CalibrationWizard, and its own pure logic is tested directly instead.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..');
const ROBOT_PREVIEW_STUB = path.join(here, 'stubs/CalibrationRobotPreviewStub.tsx');
const ROUTER_STUB = path.join(here, 'stubs/reactRouterDomStub.ts');
const ANTD_STUB = path.join(here, 'stubs/antdStub.tsx');
const ANT_ICONS_STUB = path.join(here, 'stubs/antIconsStub.tsx');

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

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CALIBRATION WIZARD UI VERIFICATION SUITE');
console.log('================================================================\n');

let server: ViteDevServer | undefined;
try {
    server = await createServer({
        server: { middlewareMode: true },
        // Resolve the project root and config explicitly rather than from process.cwd():
        // this file is run with a path argument, so cwd may be a different checkout of
        // this same repo (e.g. the main worktree) while the stub files and the source
        // under test both live in this one, PR #156's own branch worktree.
        root: projectRoot,
        configFile: path.join(projectRoot, 'vite.config.ts'),
        // This harness only ever loads the specific modules it asks for below, so skip
        // the dev server's whole-app dependency crawl (it starts from index.html and
        // would otherwise resolve react-router-dom/antd for unrelated files too).
        optimizeDeps: { noDiscovery: true, entries: [] },
        resolve: {
            alias: [
                // The wizard's own render-phase logic is what's under test here, not
                // the 3D preview's WebGL rendering (covered separately, see below).
                { find: './CalibrationRobotPreview.tsx', replacement: ROBOT_PREVIEW_STUB },
                // Static rendering never fires a real navigation; see the stub's comment.
                { find: 'react-router-dom', replacement: ROUTER_STUB },
                // Real antd/@ant-design/icons hit a dual-package ESM/CJS resolution
                // hazard under Vite's SSR loader; these keep enough shape to exercise
                // the wizard's own render-phase logic instead (see the stubs' comments).
                { find: '@ant-design/icons', replacement: ANT_ICONS_STUB },
                { find: 'antd', replacement: ANTD_STUB },
            ],
        },
    });

    const model = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/calibrationModel.ts',
    );
    const { CalibrationWizard } = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/CalibrationWizard.tsx',
    );
    const { CalibrationHealthChecks } = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/CalibrationHealthChecks.tsx',
    );
    const { JointRangeBar } = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/JointRangeBar.tsx',
    );
    const { WizardFooter } = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/WizardFooter.tsx',
    );
    const layout = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/calibrationLayout.ts',
    );
    const cameraUtils = await server.ssrLoadModule('/src/Utils/camera.utils.ts');
    const robotPreviewMod = await server.ssrLoadModule(
        '/src/features/hardwareConfiguration/calibration/CalibrationRobotPreview.tsx',
    );

    console.log('[SECTION 1] calibrationLayout.ts (shared step layout styles)');
    console.log('----------------------------------------------------------------');
    check('stepBody fills the remaining height and scrolls on its own', layout.stepBody.flex === 1 && layout.stepBody.overflowY === 'auto');
    check('twoColumns lays out two equal, independently scrollable panes', layout.twoColumns.gridTemplateColumns === 'minmax(0, 1fr) minmax(0, 1fr)');
    check('textColumn scrolls independently of its sibling', layout.textColumn.overflowY === 'auto');

    console.log('\n[SECTION 2] camera.utils.ts (shared camera defaults)');
    console.log('----------------------------------------------------------------');
    check('DEFAULT_CAMERA positions the camera above and in front of the origin', cameraUtils.DEFAULT_CAMERA.position[1] > 0 && cameraUtils.DEFAULT_CAMERA.position[2] > 0);
    check('DEFAULT_VIEW_DIRECTION is a unit vector', Math.abs(cameraUtils.DEFAULT_VIEW_DIRECTION.length() - 1) < 1e-9);

    console.log('\n[SECTION 3] CalibrationRobotPreview pure helpers');
    console.log('----------------------------------------------------------------');
    const fakeRobot = {
        joints: {
            shoulder_pan: { jointType: 'revolute', children: [{ isURDFLink: true, name: 'shoulder_link' }] },
            gripper_fixed: { jointType: 'fixed', children: [] },
        },
    };
    const pose = robotPreviewMod.urdfDefaultPose(fakeRobot as never);
    check('urdfDefaultPose zeroes every movable joint', pose.get('shoulder_pan') === 0);
    check('urdfDefaultPose skips fixed joints', !pose.has('gripper_fixed'));
    check('urdfDefaultPose is empty for a null robot', robotPreviewMod.urdfDefaultPose(null).size === 0);
    check('childLinkName finds the child URDF link', robotPreviewMod.childLinkName(fakeRobot as never, 'shoulder_pan') === 'shoulder_link');
    check('childLinkName is null for an unknown joint', robotPreviewMod.childLinkName(fakeRobot as never, 'does_not_exist') === null);

    // LucyLoader (rendered in the applied/verify_drive phases below) reaches
    // RosBridgeService, which needs a browser window to compute the ROS bridge URL.
    // Set this only now, after CalibrationRobotPreview's real module graph has already
    // loaded above: three-fiber's GPU-detection dependency runs browser-only code the
    // instant `typeof window !== 'undefined'`, which a too-early fake window would trip.
    globalThis.window ??= {
        location: { protocol: 'http:', host: 'localhost' },
        addEventListener: () => {},
        removeEventListener: () => {},
    } as unknown as Window;
    globalThis.localStorage ??= {
        getItem: () => null,
        setItem: () => {},
    } as unknown as Storage;

    console.log('\n[SECTION 4] WizardFooter');
    console.log('----------------------------------------------------------------');
    const footerMarkup = renderToStaticMarkup(
        React.createElement(WizardFooter, {
            left: React.createElement('span', null, 'Cancel'),
            right: React.createElement('span', null, 'Next'),
        }),
    );
    check('WizardFooter renders its left and right slots', footerMarkup.includes('Cancel') && footerMarkup.includes('Next'));
    check('WizardFooter is a no-op with no slots filled', renderToStaticMarkup(React.createElement(WizardFooter, {})).includes('calibration-footer'));

    console.log('\n[SECTION 5] CalibrationHealthChecks');
    console.log('----------------------------------------------------------------');
    const healthMarkup = renderToStaticMarkup(
        React.createElement(CalibrationHealthChecks, {
            health: [
                { id: 'firmware', required: true, ok: true, label: 'Firmware' },
                { id: 'adapter', required: true, ok: false, label: 'USB adapter' },
                { id: 'load', required: false, ok: false, label: 'Load' },
            ],
        }),
    );
    check('CalibrationHealthChecks lists every check', healthMarkup.includes('Firmware') && healthMarkup.includes('USB adapter') && healthMarkup.includes('Load'));
    check('CalibrationHealthChecks shows a fix hint for a failing required check', healthMarkup.includes('Plug in the arm'));
    check('CalibrationHealthChecks shows a fix hint for a failing optional check', healthMarkup.includes('Something may be stuck'));
    check('CalibrationHealthChecks renders an empty list with none', renderToStaticMarkup(React.createElement(CalibrationHealthChecks, { health: [] })).includes('calibration-health'));

    console.log('\n[SECTION 6] JointRangeBar');
    console.log('----------------------------------------------------------------');
    const barMarkup = renderToStaticMarkup(
        React.createElement(JointRangeBar, { range: [1000, 3000], ticks: 2000, minSpan: 1500 }),
    );
    check('JointRangeBar renders a meter with the recorded span', barMarkup.includes('role="meter"') && barMarkup.includes('Current position'));
    const barNoRangeMarkup = renderToStaticMarkup(
        React.createElement(JointRangeBar, { range: null, ticks: null, minSpan: 100 }),
    );
    check('JointRangeBar with no range omits the live position marker', !barNoRangeMarkup.includes('Current position'));

    console.log('\n[SECTION 7] CalibrationWizard phases');
    console.log('----------------------------------------------------------------');

    function makeSession(status: unknown, overrides: Record<string, unknown> = {}) {
        return {
            status,
            supported: true,
            busy: false,
            error: null,
            activated: false,
            activation: '',
            send: async () => true,
            activate: async () => true,
            resetActivation: () => {},
            ...overrides,
        };
    }

    function renderWizard(status: unknown, overrides: Record<string, unknown> = {}): string {
        const session = makeSession(status, overrides);
        return renderToStaticMarkup(React.createElement(CalibrationWizard, { session }));
    }

    const recoveryMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'recovery',
        message: 'A previous session stopped partway through',
        warnings: ['The last capture may be incomplete'],
    }, { error: { code: 'transport', message: 'lost the connection' } });
    check('Recovery phase offers restore and resume', recoveryMarkup.includes('Restore') && recoveryMarkup.includes('Resume'));
    check('Recovery phase surfaces the session error', recoveryMarkup.includes('lost the connection'));
    check('Recovery phase surfaces a warning', recoveryMarkup.includes('may be incomplete'));

    const idleMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'idle',
        health: [
            { id: 'firmware', required: true, ok: true, label: 'Firmware' },
            { id: 'control_lock', required: false, ok: false, label: 'Control lock' },
        ],
    });
    check('Idle phase offers starting a fresh calibration', idleMarkup.includes('Start calibration'));
    check('Idle phase filters out the control_lock health check', !idleMarkup.includes('Control lock'));

    const idleAmbiguousMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'idle',
        link: 'ambiguous',
        adapters: [{ port: '/dev/ttyACM0', serial: 'ABC123' }],
    });
    check('Idle phase with several adapters asks which arm', idleAmbiguousMarkup.includes('Which arm?'));

    const midPoseMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'mid_pose',
        health: [{ id: 'servos', required: true, ok: true, label: 'Servos' }],
    });
    check('Mid-pose phase asks to pose the arm', midPoseMarkup.includes('Put the arm in this pose'));

    const jointsMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'joints',
        recording: 'shoulder_pan',
        range: [1000, 3000],
        joints: [
            { name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 },
            { name: 'elbow', min_span: 100, full_turn: true, ticks: null },
        ],
    }, { error: { code: 'span_too_small', message: 'Not enough travel recorded' } });
    check('Joints phase shows the joint being recorded', jointsMarkup.includes('shoulder_pan'));
    check('Joints phase offers accepting a too-small span anyway', jointsMarkup.includes('Accept anyway'));
    check('Joints phase renders the range meter while recording', jointsMarkup.includes('role="meter"'));

    const reviewMarkup = renderWizard({
        ...model.EMPTY_STATUS,
        phase: 'review',
        joints: [{ name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 }],
        accepted: { shoulder_pan: [120, 3800] },
    });
    check('Review phase lists the accepted joints', reviewMarkup.includes('shoulder_pan') && reviewMarkup.includes('Save preset'));

    const appliedMarkup = renderWizard(
        { ...model.EMPTY_STATUS, phase: 'applied', preset: 'default' },
        { activation: 'Activating the new preset…', activated: false },
    );
    check('Applied phase offers activating when not yet activated', appliedMarkup.includes('Activate and reload'));
    check('Applied phase shows activation progress', appliedMarkup.includes('Activating the new preset'));

    const verifyDriveMarkup = renderWizard(
        { ...model.EMPTY_STATUS, phase: 'verify_drive', preset: 'default' },
        { activated: true },
    );
    check('Verify-drive phase offers only finishing once activated', verifyDriveMarkup.includes('Finish and open the control page'));
} finally {
    await server?.close();
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed (${passCount + failCount} total)`);
console.log('================================================================\n');

if (failCount > 0) {
    process.exit(1);
}
