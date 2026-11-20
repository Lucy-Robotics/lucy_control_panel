/*
 * Lucy Control Panel - Automated CSS Security Test Runner
 * Evaluates all good and bad stylesheets against CssSecurityService.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { cssSecurityService } from '../src/Services/cssSecurity.service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const goodDir = path.join(__dirname, 'good');
const badDir = path.join(__dirname, 'bad');

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CSS SECURITY SYSTEM VERIFICATION SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

// Test Good Stylesheets (Expect isSafe === true)
console.log('[SECTION 1] Testing Legitimate Stylesheets (Expected: SAFE)');
console.log('----------------------------------------------------------------');
const goodFiles = fs.readdirSync(goodDir).filter(f => f.endsWith('.css'));

for (const file of goodFiles) {
    const filePath = path.join(goodDir, file);
    const css = fs.readFileSync(filePath, 'utf-8');
    const result = cssSecurityService.inspectCss(css);

    if (result.isSafe && result.violations.length === 0) {
        console.log(`✓ [PASS] ${file.padEnd(32)} -> SAFE (0 violations)`);
        passCount++;
    } else {
        console.error(`✗ [FAIL] ${file.padEnd(32)} -> UNEXPECTED VIOLATIONS:`);
        result.violations.forEach(v => console.error(`    - [${v.severity}] ${v.description}`));
        failCount++;
    }
}

console.log('\n[SECTION 2] Testing Malicious Stylesheets (Expected: DETECTED / BLOCKED)');
console.log('----------------------------------------------------------------');
const badFiles = fs.readdirSync(badDir).filter(f => f.endsWith('.css'));

for (const file of badFiles) {
    const filePath = path.join(badDir, file);
    const css = fs.readFileSync(filePath, 'utf-8');
    const result = cssSecurityService.inspectCss(css);

    if (!result.isSafe || result.violations.length > 0) {
        console.log(`✓ [PASS] ${file.padEnd(32)} -> BLOCKED / DETECTED`);
        console.log(`    Threat Level: ${result.threatLevel.toUpperCase()}`);
        result.violations.forEach(v => console.log(`    - [${v.severity.toUpperCase()}] ${v.ruleId}: ${v.description}`));
        passCount++;
    } else {
        console.error(`✗ [FAIL] ${file.padEnd(32)} -> MALICIOUS FILE NOT DETECTED!`);
        failCount++;
    }
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed (${passCount + failCount} total)`);
console.log('================================================================\n');

if (failCount > 0) {
    process.exit(1);
}
