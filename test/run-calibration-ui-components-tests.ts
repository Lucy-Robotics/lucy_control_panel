/*
 * Lucy Control Panel - Calibration UI Components Test Runner
 * Covers the small presentational components the wizard composes: WizardFooter,
 * CalibrationHealthChecks and JointRangeBar.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSuite } from './calibrationCheckRunner.ts';
import { calibrationModule, installBrowserShim, printBanner, printSection, startUiServer } from './calibrationUiHarness.ts';

const { check, report } = createSuite();

printBanner('LUCY CONTROL PANEL - CALIBRATION UI COMPONENTS SUITE');

const server = await startUiServer();
try {
    const { CalibrationHealthChecks } = await server.ssrLoadModule(calibrationModule('CalibrationHealthChecks.tsx'));
    const { JointRangeBar } = await server.ssrLoadModule(calibrationModule('JointRangeBar.tsx'));
    const { WizardFooter } = await server.ssrLoadModule(calibrationModule('WizardFooter.tsx'));
    installBrowserShim();

    printSection('WizardFooter');
    const footerMarkup = renderToStaticMarkup(
        React.createElement(WizardFooter, {
            left: React.createElement('span', null, 'Cancel'),
            right: React.createElement('span', null, 'Next'),
        }),
    );
    check('WizardFooter renders its left and right slots', footerMarkup.includes('Cancel') && footerMarkup.includes('Next'));
    check('WizardFooter is a no-op with no slots filled', renderToStaticMarkup(React.createElement(WizardFooter, {})).includes('calibration-footer'));

    printSection('CalibrationHealthChecks');
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

    printSection('JointRangeBar');
    const barMarkup = renderToStaticMarkup(
        React.createElement(JointRangeBar, { range: [1000, 3000], ticks: 2000, minSpan: 1500 }),
    );
    check('JointRangeBar renders a meter with the recorded span', barMarkup.includes('role="meter"') && barMarkup.includes('Current position'));
    const barNoRangeMarkup = renderToStaticMarkup(
        React.createElement(JointRangeBar, { range: null, ticks: null, minSpan: 100 }),
    );
    check('JointRangeBar with no range omits the live position marker', !barNoRangeMarkup.includes('Current position'));
} finally {
    await server.close();
}

report();
