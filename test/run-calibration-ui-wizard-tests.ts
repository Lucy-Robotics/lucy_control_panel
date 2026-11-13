/*
 * Lucy Control Panel - Calibration Wizard Phases Test Runner
 * Covers what CalibrationWizard renders in each phase of a calibration session.
 */

import { createSuite } from './calibrationCheckRunner.ts';
import { installBrowserShim, printBanner, printSection, startUiServer } from './calibrationUiHarness.ts';
import { loadWizardRenderer } from './calibrationWizardRender.ts';

const { check, report } = createSuite();

printBanner('LUCY CONTROL PANEL - CALIBRATION WIZARD PHASES SUITE');

const server = await startUiServer();
try {
    const { emptyStatus, renderWizard } = await loadWizardRenderer(server);
    installBrowserShim();

    printSection('CalibrationWizard phases');

    const recoveryMarkup = renderWizard({
        ...emptyStatus,
        phase: 'recovery',
        message: 'A previous session stopped partway through',
        warnings: ['The last capture may be incomplete'],
    }, { error: { code: 'transport', message: 'lost the connection' } });
    check('Recovery phase offers restore and resume', recoveryMarkup.includes('Restore') && recoveryMarkup.includes('Resume'));
    check('Recovery phase surfaces the session error', recoveryMarkup.includes('lost the connection'));
    check('Recovery phase surfaces a warning', recoveryMarkup.includes('may be incomplete'));

    const idleMarkup = renderWizard({
        ...emptyStatus,
        phase: 'idle',
        health: [
            { id: 'firmware', required: true, ok: true, label: 'Firmware' },
            { id: 'control_lock', required: false, ok: false, label: 'Control lock' },
        ],
    });
    check('Idle phase offers starting a fresh calibration', idleMarkup.includes('Start calibration'));
    check('Idle phase filters out the control_lock health check', !idleMarkup.includes('Control lock'));

    const idleAmbiguousMarkup = renderWizard({
        ...emptyStatus,
        phase: 'idle',
        link: 'ambiguous',
        adapters: [{ port: '/dev/ttyACM0', serial: 'ABC123' }],
    });
    check('Idle phase with several adapters asks which arm', idleAmbiguousMarkup.includes('Which arm?'));

    const midPoseMarkup = renderWizard({
        ...emptyStatus,
        phase: 'mid_pose',
        health: [{ id: 'servos', required: true, ok: true, label: 'Servos' }],
    });
    check('Mid-pose phase asks to pose the arm', midPoseMarkup.includes('Put the arm in this pose'));
    check(
        'Mid-pose phase hides the checklist already shown on the idle phase',
        !midPoseMarkup.includes('calibration-health'),
    );

    const midPoseUnhealthyMarkup = renderWizard({
        ...emptyStatus,
        phase: 'mid_pose',
        health: [{ id: 'torque', required: true, ok: false, label: 'Torque on' }],
    });
    check(
        'Mid-pose phase shows the checklist again when a required check fails',
        midPoseUnhealthyMarkup.includes('Torque on'),
    );

    const jointsMarkup = renderWizard({
        ...emptyStatus,
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
        ...emptyStatus,
        phase: 'review',
        joints: [{ name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 }],
        accepted: { shoulder_pan: [120, 3800] },
    });
    check('Review phase lists the accepted joints', reviewMarkup.includes('shoulder_pan') && reviewMarkup.includes('Save preset'));

    const appliedMarkup = renderWizard(
        { ...emptyStatus, phase: 'applied', preset: 'default' },
        { activation: 'Activating the new preset…', activated: false },
    );
    check('Applied phase offers activating when not yet activated', appliedMarkup.includes('Activate and reload'));
    check('Applied phase shows activation progress', appliedMarkup.includes('Activating the new preset'));

    const verifyDriveMarkup = renderWizard(
        { ...emptyStatus, phase: 'verify_drive', preset: 'default' },
        { activated: true },
    );
    check('Verify-drive phase offers only finishing once activated', verifyDriveMarkup.includes('Finish and open the control page'));
} finally {
    await server.close();
}

report();
