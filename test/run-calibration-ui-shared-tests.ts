/*
 * Lucy Control Panel - Calibration UI Shared Helpers Test Runner
 * Covers calibrationLayout, camera.utils and the pure helpers of CalibrationRobotPreview.
 */

import { createSuite } from './calibrationCheckRunner.ts';
import { calibrationModule, printBanner, printSection, startUiServer } from './calibrationUiHarness.ts';

const { check, report } = createSuite();

printBanner('LUCY CONTROL PANEL - CALIBRATION UI SHARED HELPERS SUITE');

const server = await startUiServer();
try {
    const layout = await server.ssrLoadModule(calibrationModule('calibrationLayout.ts'));
    const cameraUtils = await server.ssrLoadModule('/src/Utils/camera.utils.ts');
    const robotPreviewMod = await server.ssrLoadModule(calibrationModule('CalibrationRobotPreview.tsx'));

    printSection('calibrationLayout.ts (shared step layout styles)');
    check('stepBody fills the remaining height and scrolls on its own', layout.stepBody.flex === 1 && layout.stepBody.overflowY === 'auto');
    check('twoColumns lays out two equal, independently scrollable panes', layout.twoColumns.gridTemplateColumns === 'minmax(0, 1fr) minmax(0, 1fr)');
    check('textColumn scrolls independently of its sibling', layout.textColumn.overflowY === 'auto');

    printSection('camera.utils.ts (shared camera defaults)');
    check('DEFAULT_CAMERA positions the camera above and in front of the origin', cameraUtils.DEFAULT_CAMERA.position[1] > 0 && cameraUtils.DEFAULT_CAMERA.position[2] > 0);
    check('DEFAULT_VIEW_DIRECTION is a unit vector', Math.abs(cameraUtils.DEFAULT_VIEW_DIRECTION.length() - 1) < 1e-9);

    printSection('CalibrationRobotPreview pure helpers');
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
} finally {
    await server.close();
}

report();
