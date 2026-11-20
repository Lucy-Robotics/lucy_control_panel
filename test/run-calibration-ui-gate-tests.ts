/*
 * Lucy Control Panel - Calibration Wizard Health Gate Test Runner
 * Covers which wizard actions are blocked while a required health check fails.
 */

import { createSuite } from './calibrationCheckRunner.ts';
import { installBrowserShim, printBanner, printSection, startUiServer } from './calibrationUiHarness.ts';
import { loadWizardRenderer } from './calibrationWizardRender.ts';

const { check, report } = createSuite();

printBanner('LUCY CONTROL PANEL - CALIBRATION WIZARD HEALTH GATE SUITE');

const server = await startUiServer();
try {
    const { emptyStatus, renderWizard } = await loadWizardRenderer(server);
    installBrowserShim();

    printSection('CalibrationWizard health gate');
    const okCheck = { id: 'firmware', required: true, ok: true, label: 'Firmware' };
    const badCheck = { id: 'adapter', required: true, ok: false, label: 'USB adapter' };
    const disabledButton = (markup: string, label: string) => new RegExp(`<button[^>]*disabled[^>]*>${label}`).test(markup);
    const joints = [{ name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 }];

    const idleOk = renderWizard({ ...emptyStatus, phase: 'idle', health: [okCheck] });
    check('Start calibration is enabled when the checklist is green', !disabledButton(idleOk, 'Start calibration'));
    const idleBad = renderWizard({ ...emptyStatus, phase: 'idle', health: [okCheck, badCheck] });
    check('Start calibration is disabled while a required check fails', disabledButton(idleBad, 'Start calibration'));
    const idleNoHealth = renderWizard({ ...emptyStatus, phase: 'idle', health: [] });
    check('Start calibration is disabled before any check is reported', disabledButton(idleNoHealth, 'Start calibration'));

    const jointsBad = renderWizard({
        ...emptyStatus, phase: 'joints', recording: 'shoulder_pan', range: [1000, 3000], joints, health: [badCheck],
    });
    check('Joints phase names the failing check and says calibration is blocked', jointsBad.includes('calibration-blocked') && jointsBad.includes('USB adapter'));
    check('Joints phase disables accepting a joint while blocked', disabledButton(jointsBad, 'Accept and continue'));
    check('Joints phase disables starting a joint over while blocked', disabledButton(jointsBad, 'Start over'));
    check('Joints phase keeps Cancel available while blocked', !disabledButton(jointsBad, 'Cancel'));
    const jointsOk = renderWizard({
        ...emptyStatus, phase: 'joints', recording: 'shoulder_pan', range: [1000, 3000], joints, health: [okCheck],
    });
    check('Joints phase shows no block notice when green', !jointsOk.includes('calibration-blocked'));
    check('Joints phase enables accepting a joint when green', !disabledButton(jointsOk, 'Accept and continue'));

    const reviewBad = renderWizard({
        ...emptyStatus, phase: 'review', joints, accepted: { shoulder_pan: [120, 3800] }, health: [badCheck],
    });
    check('Review phase disables saving the preset while blocked', disabledButton(reviewBad, 'Save preset'));
    check('Review phase disables redoing a joint while blocked', disabledButton(reviewBad, 'Redo'));

    const appliedDead = renderWizard({ ...emptyStatus, phase: 'applied', preset: 'default', health: [badCheck] });
    check('Activating is not blocked by the arm checks', !appliedDead.includes('calibration-blocked') && !disabledButton(appliedDead, 'Activate and reload'));
} finally {
    await server.close();
}

report();
