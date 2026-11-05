import { BUILTIN_THEMES, type ThemePreset } from '../src/Constants/builtinThemes.ts';
import { CSS_VARIABLES_MAP, deriveSurfaceTokens, relativeLuminance } from '../src/Constants/theme.ts';

const MIN_TEXT_CONTRAST = 4.5;     // WCAG 2.2 SC 1.4.3 (AA, normal text)
const MIN_NON_TEXT_CONTRAST = 3;   // WCAG 2.2 SC 1.4.11 (UI component boundaries)
const MIN_STATUS_DE_SIMULATED = 20; // CIEDE2000 between status colours under the target CVD
const MIN_STATUS_DE_NORMAL = 10;    // CIEDE2000 between status colours for normal vision
const MIN_GRAY_STEP_L = 14.5;       // CIELAB L* between neighbouring grey levels; the widest even ladder that fits (see docs)

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };
type Simulation = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

const SURFACES = ['--color-bg', '--color-surface-1', '--color-surface-2', '--color-surface-3'] as const;
const TEXT_TOKENS = [
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-highlight',
    '--color-highlight-light',
    '--color-status-active',
    '--color-status-error',
    '--color-status-warning',
    '--color-status-info',
    '--color-accent-2',
] as const;
// Control frames (buttons, inputs, selects, toggles) must reach 3:1 where controls sit: the canvas
// and panels. Container frames (--color-line: cards, tables, rails) are decorative and only reported.
const CONTROL_LINE_TOKEN = '--color-line-strong';
const CONTAINER_LINE_TOKEN = '--color-line';
const CONTROL_SURFACE_COUNT = 2; // --color-bg, --color-surface-1
const STATUS_TOKENS = {
    active: '--color-status-active',
    error: '--color-status-error',
    warning: '--color-status-warning',
    info: '--color-status-info',
} as const;

const CVD_SIMULATION: Record<string, Simulation> = {
    'cvd-protanopia': 'protanopia',
    'cvd-deuteranopia': 'deuteranopia',
    'cvd-tritanopia': 'tritanopia',
    'cvd-achromatopsia': 'achromatopsia',
};

// Presets held to the hard rules. The default brand theme is reported as warnings only.
const STRICT_PRESETS = new Set(['lucy-light', ...Object.keys(CVD_SIMULATION)]);

// ─── Colour maths ────────────────────────────────────────────────────────────
function parseColor(value: string): Rgba {
    const v = value.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
    if (fn) {
        return { r: +fn[1], g: +fn[2], b: +fn[3], a: fn[4] === undefined ? 1 : +fn[4] };
    }
    throw new Error(`Unsupported colour value: ${value}`);
}

function toHex({ r, g, b }: Rgb): string {
    return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Alpha-composites a colour over an opaque backdrop, as the browser does. */
function composite(fg: Rgba, bg: Rgb): Rgb {
    return {
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
    };
}

function contrastRatio(a: Rgb, b: Rgb): number {
    const la = relativeLuminance(toHex(a));
    const lb = relativeLuminance(toHex(b));
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const srgbToLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const MACHADO: Record<'protanopia' | 'deuteranopia' | 'tritanopia', number[][]> = {
    protanopia: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ],
    deuteranopia: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881],
    ],
    tritanopia: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900],
    ],
};

function simulateLinear(color: Rgb, sim: Simulation): [number, number, number] {
    const lin: [number, number, number] = [srgbToLinear(color.r), srgbToLinear(color.g), srgbToLinear(color.b)];
    if (sim === 'none') return lin;
    if (sim === 'achromatopsia') {
        const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
        return [y, y, y];
    }
    const m = MACHADO[sim];
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    return [0, 1, 2].map(i => clamp(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2])) as [number, number, number];
}

/** Linear sRGB → CIELAB (D65). */
function linearToLab([r, g, b]: [number, number, number]): [number, number, number] {
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). */
function deltaE2000([L1, a1, b1]: number[], [L2, a2, b2]: number[]): number {
    const rad = Math.PI / 180;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
    const Cbar7 = ((C1 + C2) / 2) ** 7;
    const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
    const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    const hue = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
    const h1p = hue(b1, a1p), h2p = hue(b2, a2p);

    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        dhp = h2p - h1p;
        if (dhp > 180) dhp -= 360;
        else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

    const Lbp = (L1 + L2) / 2;
    const Cbp = (C1p + C2p) / 2;
    let hbp = h1p + h2p;
    if (C1p * C2p !== 0) {
        hbp = Math.abs(h1p - h2p) <= 180 ? hbp / 2 : (hbp < 360 ? (hbp + 360) / 2 : (hbp - 360) / 2);
    }
    const T = 1
        - 0.17 * Math.cos((hbp - 30) * rad)
        + 0.24 * Math.cos(2 * hbp * rad)
        + 0.32 * Math.cos((3 * hbp + 6) * rad)
        - 0.20 * Math.cos((4 * hbp - 63) * rad);
    const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
    const SC = 1 + 0.045 * Cbp;
    const SH = 1 + 0.015 * Cbp * T;
    const Cbp7 = Cbp ** 7;
    const RT = -2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hbp - 275) / 25) ** 2)) * rad);

    return Math.sqrt(
        (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH),
    );
}

const labOf = (color: Rgb, sim: Simulation) => linearToLab(simulateLinear(color, sim));

// ─── Token resolution (mirrors themeService.applyActiveTheme) ────────────────
function resolveTokens(preset: ThemePreset): Record<string, string> {
    const tokens: Record<string, string> = { ...CSS_VARIABLES_MAP };
    if (preset.id === 'default') return tokens;

    const defined = new Map<string, string>();
    const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;!}\n\r]+)/g;
    let match;
    while ((match = varRegex.exec(preset.css ?? '')) !== null) {
        defined.set(match[1].trim(), match[2].trim());
        tokens[match[1].trim()] = match[2].trim();
    }
    tokens['--color-main'] = preset.colors.main;
    tokens['--color-secondary'] = preset.colors.secondary;
    tokens['--color-highlight'] = preset.colors.highlight;
    tokens['--color-text-primary'] = preset.colors.text;
    for (const [name, value] of Object.entries(deriveSurfaceTokens(preset.colors))) {
        if (!defined.has(name)) tokens[name] = value;
    }
    return tokens;
}

// ─── Runner ──────────────────────────────────────────────────────────────────
const reportMode = process.argv.includes('--report');
let passCount = 0;
let failCount = 0;
let warnCount = 0;

function check(strict: boolean, ok: boolean, label: string): void {
    if (ok) {
        passCount++;
        if (!reportMode) console.log(`✓ [PASS] ${label}`);
    } else if (strict) {
        failCount++;
        console.error(`✗ [FAIL] ${label}`);
    } else {
        warnCount++;
        if (!reportMode) console.warn(`! [WARN] ${label}`);
    }
}

const fmt = (n: number) => n.toFixed(2);
const report: string[] = [];

if (!reportMode) {
    console.log('================================================================');
    console.log('LUCY CONTROL PANEL - THEME ACCESSIBILITY VERIFICATION SUITE');
    console.log('================================================================');
}

for (const preset of BUILTIN_THEMES) {
    const strict = STRICT_PRESETS.has(preset.id);
    const tokens = resolveTokens(preset);
    const surfaceNames: string[] = [...SURFACES, ...(tokens['--color-header-fill'] ? ['--color-header-fill'] : [])];
    const surfaces = surfaceNames.map(s => composite(parseColor(tokens[s]), { r: 0, g: 0, b: 0 }));
    const color = (name: string, over: Rgb) => composite(parseColor(tokens[name]), over);

    if (!reportMode) {
        console.log(`\n[${preset.name}] (${preset.id})${strict ? '' : ' — advisory'}`);
        console.log('----------------------------------------------------------------');
    }
    report.push(`### ${preset.name} (\`${preset.id}\`)`, '');

    // 1. Text contrast on every surface tier
    report.push('| Token | Value | ' + surfaceNames.map(s => `on \`${s.replace('--color-', '')}\``).join(' | ') + ' |');
    report.push('| :--- | :---: |' + surfaceNames.map(() => ' :---: |').join(''));
    for (const token of TEXT_TOKENS) {
        if (!tokens[token]) continue;
        const ratios = surfaces.map(bg => contrastRatio(color(token, bg), bg));
        const worst = Math.min(...ratios);
        check(strict, worst >= MIN_TEXT_CONTRAST, `${token.padEnd(26)} text contrast min ${fmt(worst)}:1 (>= ${MIN_TEXT_CONTRAST})`);
        report.push(`| \`${token}\` | \`${tokens[token]}\` | ${ratios.map(r => `${fmt(r)}${r < MIN_TEXT_CONTRAST ? ' ✗' : ''}`).join(' | ')} |`);
    }

    // 2. Boundaries (non-text contrast)
    for (const token of [CONTROL_LINE_TOKEN, CONTAINER_LINE_TOKEN]) {
        const ratios = surfaces.map(bg => contrastRatio(color(token, bg), bg));
        const enforced = token === CONTROL_LINE_TOKEN;
        const worst = Math.min(...(enforced ? ratios.slice(0, CONTROL_SURFACE_COUNT) : ratios));
        check(strict && enforced && preset.id === 'lucy-light', worst >= MIN_NON_TEXT_CONTRAST,
            `${token.padEnd(26)} ${enforced ? 'control' : 'container'} frame min ${fmt(worst)}:1 (>= ${MIN_NON_TEXT_CONTRAST})`);
        const label = enforced ? 'control frame' : 'container frame, decorative';
        report.push(`| \`${token}\` (${label}) | \`${tokens[token]}\` | ${ratios.map((r, k) => `${fmt(r)}${enforced && k < CONTROL_SURFACE_COUNT && r < MIN_NON_TEXT_CONTRAST ? ' ✗' : ''}`).join(' | ')} |`);
    }

    // 2b. Coloured text on its own tinted fill (status boxes, alerts, hover and active tints)
    const tintPercent = parseFloat(tokens['--color-status-tint'] ?? '');
    const tinted: [string, (bg: Rgb) => Rgb][] = [];
    if (!Number.isNaN(tintPercent)) {
        for (const token of Object.values(STATUS_TOKENS)) {
            tinted.push([token, bg => composite({ ...parseColor(tokens[token]), a: tintPercent / 100 }, bg)]);
        }
    }
    if (tokens['--color-accent-2'] && tokens['--color-accent-2-soft']) {
        tinted.push(['--color-accent-2', bg => composite(parseColor(tokens['--color-accent-2-soft']), bg)]);
    }
    if (tokens['--color-active-fill']) {
        tinted.push(['--color-highlight', bg => composite(parseColor(tokens['--color-active-fill']), bg)]);
    }
    for (const [token, fillOver] of tinted) {
        // Tints sit on the canvas, panels or the status-box base (surface-2), never on hover or header fills.
        const ratios = surfaces.slice(0, 3).map(bg => { const fill = fillOver(bg); return contrastRatio(color(token, fill), fill); });
        const worst = Math.min(...ratios);
        check(strict, worst >= MIN_TEXT_CONTRAST, `${token.padEnd(26)} on its tinted fill min ${fmt(worst)}:1 (>= ${MIN_TEXT_CONTRAST})`);
        report.push(`| \`${token}\` (on its tint) | \`${tokens[token]}\` | ${ratios.map(r => `${fmt(r)}${r < MIN_TEXT_CONTRAST ? ' ✗' : ''}`).join(' | ')} |${' — |'.repeat(surfaces.length - 3)}`);
    }

    // 2c. Light themes stay off-white: no resolved colour token may be pure white
    if (preset.id === 'lucy-light') {
        const whites = Object.entries(tokens).filter(([name, value]) => {
            if (!name.startsWith('--color-') && !name.startsWith('--ui-')) return false;
            try {
                const c = parseColor(value);
                return c.a > 0.5 && Math.min(c.r, c.g, c.b) >= 252;
            } catch {
                return false;
            }
        });
        check(strict, whites.length === 0, `no pure-white colour tokens${whites.length ? ` (found: ${whites.map(([n, v]) => `${n}=${v}`).join(', ')})` : ''}`);
    }

    // 3. Text placed on filled controls
    const onFill: [string, string][] = [
        ['--color-text-on-highlight', '--color-highlight'],
        ['--color-text-on-error', '--color-status-error'],
    ];
    const fillLines: string[] = [];
    for (const [fg, fill] of onFill) {
        const fgValue = tokens[fg] ?? tokens['--color-text-primary'];
        const fillRgb = color(fill, surfaces[0]);
        const ratio = contrastRatio(composite(parseColor(fgValue), fillRgb), fillRgb);
        check(strict, ratio >= MIN_TEXT_CONTRAST, `${fg.padEnd(26)} on ${fill} ${fmt(ratio)}:1 (>= ${MIN_TEXT_CONTRAST})`);
        fillLines.push(`\`${fg}\` on \`${fill}\`: **${fmt(ratio)}:1**`);
    }
    report.push('', fillLines.join(' · '), '');

    // 4. Status colours under simulated colour vision
    const sims: Simulation[] = CVD_SIMULATION[preset.id]
        ? ['none', CVD_SIMULATION[preset.id]]
        : ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    const names = Object.keys(STATUS_TOKENS) as (keyof typeof STATUS_TOKENS)[];
    const statusRgb = names.map(n => color(STATUS_TOKENS[n], surfaces[0]));
    const grayscale = CVD_SIMULATION[preset.id] === 'achromatopsia';

    report.push('| Status pair | ' + sims.map(s => `ΔE00 (${s})`).join(' | ') + ' |');
    report.push('| :--- |' + sims.map(() => ' :---: |').join(''));
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const cells = sims.map(sim => {
                const de = deltaE2000(labOf(statusRgb[i], sim), labOf(statusRgb[j], sim));
                const target = CVD_SIMULATION[preset.id] === sim;
                const min = sim === 'none' ? MIN_STATUS_DE_NORMAL : MIN_STATUS_DE_SIMULATED;
                // Greys differ in lightness only; they are judged by the L* ladder below instead.
                if ((sim === 'none' || target) && !grayscale) {
                    check(strict, de >= min, `${`${names[i]} vs ${names[j]}`.padEnd(18)} ΔE00 ${de.toFixed(1).padStart(5)} under ${sim} (>= ${min})`);
                }
                return `${de.toFixed(1)}${de < min && !grayscale && (sim === 'none' || target || !strict) ? ' ✗' : ''}`;
            });
            report.push(`| ${names[i]} / ${names[j]} | ${cells.join(' | ')} |`);
        }
    }

    // 5. Achromatopsia: neighbouring grey levels must differ in lightness
    if (CVD_SIMULATION[preset.id] === 'achromatopsia') {
        const levels = names
            .map((n, k) => ({ n, L: labOf(statusRgb[k], 'achromatopsia')[0] }))
            .sort((a, b) => b.L - a.L);
        for (let k = 1; k < levels.length; k++) {
            const dL = levels[k - 1].L - levels[k].L;
            check(strict, dL >= MIN_GRAY_STEP_L, `${`${levels[k - 1].n} → ${levels[k].n}`.padEnd(18)} ΔL* ${dL.toFixed(1).padStart(5)} (>= ${MIN_GRAY_STEP_L})`);
        }
        report.push('', 'Lightness ladder (L\\*): ' + levels.map(l => `${l.n} ${l.L.toFixed(1)}`).join(' → '));
    }
    report.push('');
}

if (reportMode) {
    console.log(report.join('\n'));
} else {
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed, ${warnCount} advisory warnings`);
    console.log('================================================================\n');
}

if (failCount > 0) {
    process.exit(1);
}
