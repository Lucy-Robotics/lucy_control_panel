/*
 * Lucy Control Panel - Calibration Preset YAML Test Runner
 * Covers hardwareConfigYaml.ts's round-trip of a preset's calibration block.
 */

import { parseHardwareConfigYaml, stringifyHardwareConfigYaml } from '../src/Utils/hardwareConfigYaml.ts';
import { createSuite, deepEqual } from './calibrationCheckRunner.ts';

const { check, report } = createSuite();

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CALIBRATION PRESET YAML TEST SUITE');
console.log('================================================================\n');

const yamlDoc = parseHardwareConfigYaml(
    "version: 1\ncalibration:\n  adapter_serial: '5970072960'\n  homing_offsets: {rotation: -5}\n",
);
const yamlAgain = parseHardwareConfigYaml(stringifyHardwareConfigYaml(yamlDoc));
check('saving a preset from the YAML editor keeps its calibration', deepEqual(
    yamlAgain.calibration,
    { adapter_serial: '5970072960', homing_offsets: { rotation: -5 } },
));

report();
