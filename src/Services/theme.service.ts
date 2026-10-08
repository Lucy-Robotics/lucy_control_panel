/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * ============================================================================
 * THEME SERVICE - MODULAR RUNTIME CSS THEME ENGINE
 * ============================================================================
 * Allows users to apply custom CSS stylesheets, load themes from files (.css),
 * URLs, or inline Quick CSS, and provides curated preset themes.
 */

import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
    injectThemeVariables,
} from '../Constants/theme';
import {
    cssSecurityService,
    type CssSecurityInspectionResult,
    type FetchCssResult,
    type SecurityPolicyOptions,
    SecurityInspectionError,
} from './cssSecurity.service';

export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    colors: {
        main: string;
        secondary: string;
        highlight: string;
        text: string;
    };
    css?: string;
}

export const THEME_STORAGE_KEYS = {
    ACTIVE_THEME: 'lucy_active_theme_id',
    CUSTOM_CSS: 'lucy_custom_theme_css',
    THEME_ENABLED: 'lucy_custom_theme_enabled',
    THEME_URL: 'lucy_theme_url',
} as const;

export const BUILTIN_THEMES: ThemePreset[] = [
    {
        id: 'default',
        name: 'Lucy (Default)',
        description: 'Official 75-10-15 theme: Rich black (#141414), Gray blue (#2B3E50), electric green highlight (#00FF41), off-white text (#F7F1E5).',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: MAIN_COLOR,
            secondary: SECONDARY_COLOR,
            highlight: HIGHLIGHT_COLOR,
            text: TEXT_PRIMARY,
        },
        css: '', // Uses base CSS variables
    },
    {
        id: 'midnight-cyan',
        name: 'Midnight Neon',
        description: 'Deep space obsidian with electric cyan accents and sleek slate borders.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#0B0F19',
            secondary: '#1E293B',
            highlight: '#00D8FF',
            text: '#F1F5F9',
        },
        css: `
:root {
  --color-main: #0B0F19;
  --color-main-surface: #0B0F19;
  --color-main-elevated: #131B2E;
  --color-main-deep: #06080E;
  --color-secondary: #1E293B;
  --color-secondary-border: #1E293B;
  --color-secondary-subtle: rgba(30, 41, 59, 0.45);
  --color-highlight: #00D8FF;
  --color-highlight-light: #4DE4FF;
  --color-highlight-glow: rgba(0, 216, 255, 0.25);
  --color-highlight-glow-strong: rgba(0, 216, 255, 0.55);
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #94A3B8;
  --ui-accent-green: #00D8FF;
}
        `.trim(),
    },
    {
        id: 'solar-tactical',
        name: 'Solar Tactical',
        description: 'High-contrast military aerospace theme with amber telemetry and charred carbon surfaces.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#121212',
            secondary: '#3E3224',
            highlight: '#FFB300',
            text: '#FFF8E7',
        },
        css: `
:root {
  --color-main: #121212;
  --color-main-surface: #121212;
  --color-main-elevated: #1B1A17;
  --color-main-deep: #0A0A09;
  --color-secondary: #3E3224;
  --color-secondary-border: #3E3224;
  --color-secondary-subtle: rgba(62, 50, 36, 0.45);
  --color-highlight: #FFB300;
  --color-highlight-light: #FFC94D;
  --color-highlight-glow: rgba(255, 179, 0, 0.25);
  --color-highlight-glow-strong: rgba(255, 179, 0, 0.55);
  --color-text-primary: #FFF8E7;
  --color-text-secondary: #A89B88;
  --ui-accent-green: #FFB300;
}
        `.trim(),
    },
    {
        id: 'synthwave-crimson',
        name: 'Synthwave Void',
        description: 'Vibrant neon hot-pink highlighting on deep violet-black shadows with rose borders.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#13091B',
            secondary: '#391945',
            highlight: '#FF2A6D',
            text: '#FCEEF5',
        },
        css: `
:root {
  --color-main: #13091B;
  --color-main-surface: #13091B;
  --color-main-elevated: #1D0E29;
  --color-main-deep: #09030E;
  --color-secondary: #391945;
  --color-secondary-border: #391945;
  --color-secondary-subtle: rgba(57, 25, 69, 0.45);
  --color-highlight: #FF2A6D;
  --color-highlight-light: #FF5E91;
  --color-highlight-glow: rgba(255, 42, 109, 0.25);
  --color-highlight-glow-strong: rgba(255, 42, 109, 0.55);
  --color-text-primary: #FCEEF5;
  --color-text-secondary: #A8869E;
  --ui-accent-green: #FF2A6D;
}
        `.trim(),
    },
    {
        id: 'matrix-terminal',
        name: 'Matrix Core',
        description: 'Pure CRT terminal aesthetic: pitch black background, matrix phosphor green and deep green framing.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#050D08',
            secondary: '#16301D',
            highlight: '#00FF41',
            text: '#D4FAD9',
        },
        css: `
:root {
  --color-main: #050D08;
  --color-main-surface: #050D08;
  --color-main-elevated: #0C1A11;
  --color-main-deep: #020603;
  --color-secondary: #16301D;
  --color-secondary-border: #16301D;
  --color-secondary-subtle: rgba(22, 48, 29, 0.45);
  --color-highlight: #00FF41;
  --color-highlight-light: #4DFF7B;
  --color-highlight-glow: rgba(0, 255, 65, 0.3);
  --color-highlight-glow-strong: rgba(0, 255, 65, 0.65);
  --color-text-primary: #D4FAD9;
  --color-text-secondary: #74A07B;
  --ui-accent-green: #00FF41;
}
        `.trim(),
    },
];

const STYLE_TAG_ID = 'lucy-custom-theme-style';

class ThemeService {
    private static instance: ThemeService;
    private listeners: Set<() => void> = new Set();
    private lastSecurityInspection: CssSecurityInspectionResult | null = null;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.init();
        }
    }

    public static getInstance(): ThemeService {
        if (!ThemeService.instance) {
            ThemeService.instance = new ThemeService();
        }
        return ThemeService.instance;
    }

    public init(): void {
        this.applyActiveTheme();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) {
            try {
                listener();
            } catch (err) {
                console.error('Error in theme listener:', err);
            }
        }
    }

    public getActiveThemeId(): string {
        return localStorage.getItem(THEME_STORAGE_KEYS.ACTIVE_THEME) || 'default';
    }

    public isCustomThemeEnabled(): boolean {
        return localStorage.getItem(THEME_STORAGE_KEYS.THEME_ENABLED) !== 'false';
    }

    public getCustomCss(): string {
        return localStorage.getItem(THEME_STORAGE_KEYS.CUSTOM_CSS) || '';
    }

    public getThemeUrl(): string {
        return localStorage.getItem(THEME_STORAGE_KEYS.THEME_URL) || '';
    }

    public getLastSecurityInspection(): CssSecurityInspectionResult | null {
        return this.lastSecurityInspection;
    }

    public setActiveTheme(themeId: string): void {
        localStorage.setItem(THEME_STORAGE_KEYS.ACTIVE_THEME, themeId);
        localStorage.setItem(THEME_STORAGE_KEYS.THEME_ENABLED, 'true');
        this.applyActiveTheme();
        this.notify();
    }

    public setCustomThemeEnabled(enabled: boolean): void {
        localStorage.setItem(THEME_STORAGE_KEYS.THEME_ENABLED, String(enabled));
        this.applyActiveTheme();
        this.notify();
    }

    public setCustomCss(css: string, sanitize = true): CssSecurityInspectionResult {
        const inspection = cssSecurityService.inspectCss(css);
        this.lastSecurityInspection = inspection;

        const effectiveCss = sanitize ? inspection.sanitizedCss : css;
        localStorage.setItem(THEME_STORAGE_KEYS.CUSTOM_CSS, effectiveCss);
        localStorage.setItem(THEME_STORAGE_KEYS.THEME_ENABLED, 'true');
        // Switch to custom preset if custom CSS is entered
        if (effectiveCss.trim()) {
            localStorage.setItem(THEME_STORAGE_KEYS.ACTIVE_THEME, 'custom');
        }
        this.applyActiveTheme();
        this.notify();
        return inspection;
    }

    public async loadThemeFromUrl(url: string, customPolicy?: SecurityPolicyOptions): Promise<FetchCssResult> {
        const trimmed = url.trim();
        if (!trimmed) throw new Error('URL cannot be empty');

        const result = await cssSecurityService.fetchCssWithSecurity(trimmed, customPolicy);
        this.lastSecurityInspection = result.inspection;

        localStorage.setItem(THEME_STORAGE_KEYS.THEME_URL, trimmed);
        this.setCustomCss(result.sanitizedCss);
        return result;
    }

    public async loadThemeFromFile(file: File, customPolicy?: SecurityPolicyOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (typeof content === 'string') {
                    const inspection = cssSecurityService.inspectCss(content, customPolicy);
                    this.lastSecurityInspection = inspection;

                    if (!inspection.isSafe) {
                        const criticalOrHigh = inspection.violations.filter(
                            (v) => v.severity === 'critical' || v.severity === 'high'
                        );
                        const summary = criticalOrHigh
                            .map((v) => `• [${v.severity.toUpperCase()}] ${v.description}`)
                            .join('\n');
                        reject(
                            new SecurityInspectionError(
                                `Theme file rejected due to dangerous CSS threats:\n${summary}`,
                                inspection.violations,
                                inspection.threatLevel
                            )
                        );
                        return;
                    }

                    this.setCustomCss(inspection.sanitizedCss);
                    resolve(inspection.sanitizedCss);
                } else {
                    reject(new Error('Invalid file content format'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    public resetToDefault(): void {
        localStorage.removeItem(THEME_STORAGE_KEYS.CUSTOM_CSS);
        localStorage.removeItem(THEME_STORAGE_KEYS.THEME_URL);
        localStorage.setItem(THEME_STORAGE_KEYS.ACTIVE_THEME, 'default');
        localStorage.setItem(THEME_STORAGE_KEYS.THEME_ENABLED, 'true');
        this.applyActiveTheme();
        this.notify();
    }

    public setThemeColors(colors: { main: string; secondary: string; highlight: string; text: string; textSecondary?: string }): void {
        const textSec = colors.textSecondary || '#6C7D8E';
        const css = `/* Quick Colors Customizer */
:root {
  --color-main: ${colors.main};
  --color-main-surface: ${colors.main};
  --color-main-elevated: ${colors.main};
  --color-main-deep: ${colors.main};
  --color-secondary: ${colors.secondary};
  --color-secondary-border: ${colors.secondary};
  --color-highlight: ${colors.highlight};
  --color-text-primary: ${colors.text};
  --color-text-secondary: ${textSec};
  --ui-accent-green: ${colors.highlight};
}`;
        this.setCustomCss(css);
    }

    public getActiveColors(): ThemePreset['colors'] {
        if (!this.isCustomThemeEnabled()) {
            return BUILTIN_THEMES[0].colors;
        }
        const activeId = this.getActiveThemeId();
        if (activeId === 'custom') {
            const css = this.getCustomCss();
            const extract = (varName: string, fallback: string) => {
                const m = new RegExp(`${varName}\\s*:\\s*([^;!}\\n\\r]+)`).exec(css);
                return m ? m[1].trim() : fallback;
            };
            return {
                main: extract('--color-main', MAIN_COLOR),
                secondary: extract('--color-secondary', SECONDARY_COLOR),
                highlight: extract('--color-highlight', HIGHLIGHT_COLOR),
                text: extract('--color-text-primary', TEXT_PRIMARY),
            };
        }
        const preset = BUILTIN_THEMES.find(t => t.id === activeId);
        return preset?.colors ?? BUILTIN_THEMES[0].colors;
    }

    public applyActiveTheme(): void {
        if (typeof document === 'undefined') return;

        let styleElement = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = STYLE_TAG_ID;
            document.head.appendChild(styleElement);
        }

        const root = document.documentElement;

        // Step 1: Baseline - Always apply canonical default CSS variables first
        injectThemeVariables(root);

        // If custom themes are disabled or set to default, clear style tag
        if (!this.isCustomThemeEnabled()) {
            styleElement.textContent = '';
            document.body.style.backgroundColor = MAIN_COLOR;
            return;
        }

        const activeId = this.getActiveThemeId();

        if (activeId === 'default') {
            styleElement.textContent = '';
            document.body.style.backgroundColor = MAIN_COLOR;
            return;
        }

        let cssToApply = '';
        if (activeId === 'custom') {
            cssToApply = this.getCustomCss();
        } else {
            const preset = BUILTIN_THEMES.find(t => t.id === activeId);
            if (preset?.css) {
                cssToApply = preset.css;
            }
        }

        const sanitizedCss = cssSecurityService.sanitizeCss(cssToApply);
        styleElement.textContent = sanitizedCss;

        // Parse and set CSS variables directly on root.style so inline specificity cannot block updates
        if (sanitizedCss) {
            const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;!}\n\r]+)/g;
            let match;
            while ((match = varRegex.exec(sanitizedCss)) !== null) {
                const varName = match[1].trim();
                const varValue = match[2].trim();
                root.style.setProperty(varName, varValue);
            }
        }

        // Apply active colors to primary variables
        const colors = this.getActiveColors();
        root.style.setProperty('--color-main', colors.main);
        root.style.setProperty('--color-main-surface', colors.main);
        root.style.setProperty('--color-main-elevated', colors.main);
        root.style.setProperty('--color-main-deep', colors.main);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-secondary-border', colors.secondary);
        root.style.setProperty('--color-highlight', colors.highlight);
        root.style.setProperty('--color-text-primary', colors.text);
        root.style.setProperty('--ui-accent-green', colors.highlight);

        // Update body background
        document.body.style.backgroundColor = colors.main;
    }

    public getThemeTemplateCss(): string {
        return `/**
 * ============================================================================
 * LUCY ROBOTICS CUSTOM THEME TEMPLATE
 * ============================================================================
 * 
 * Instructions:
 * 1. Customize the CSS Custom Properties (:root) below.
 * 2. Upload this file in Lucy Control Panel -> Settings -> Themes & Custom CSS,
 *    or paste it directly into the Quick CSS Editor!
 * 
 * The app uses a 75% - 10% - 15% color system:
 * - 75% Dominant: --color-main (Backgrounds & Surfaces)
 * - 10% Secondary: --color-secondary (Borders & Small Elements)
 * - 15% Highlight: --color-highlight (Brand Accent & Active States)
 */

:root {
  /* ─── 75% Main Dominant (Surfaces & Backgrounds) ────────────────────────── */
  --color-main: #141414;
  --color-main-surface: #141414;
  --color-main-elevated: #1e1e1e;
  --color-main-deep: #0a0a0a;

  /* ─── 10% Secondary (Borders, Dividers & Small Framing) ──────────────────── */
  --color-secondary: #2B3E50;
  --color-secondary-border: #2B3E50;
  --color-secondary-subtle: rgba(43, 62, 80, 0.4);
  --color-secondary-hover: #3d5873;

  /* ─── 15% Highlight (Brand Identifier & Active States) ───────────────────── */
  --color-highlight: #00FF41;
  --color-highlight-light: #33ff66;
  --color-highlight-glow: rgba(0, 255, 65, 0.25);
  --color-highlight-glow-strong: rgba(0, 255, 65, 0.55);

  /* ─── Typography & Content (Warm Parchment, not white!) ─────────────────── */
  --color-text-primary: #F7F1E5;
  --color-text-secondary: #6C7D8E;
  --color-text-muted: #52677F;
  --color-text-on-highlight: #141414;

  /* ─── Status Colors ──────────────────────────────────────────────────────── */
  --color-status-error: #FF4343;
  --color-status-warning: #FFAA00;
  --color-status-info: #00D8FF;
  --color-status-active: #00FF41;

  /* ─── Fonts ──────────────────────────────────────────────────────────────── */
  --font-graphical: 'Orbitron', sans-serif;
  --font-title: 'IBM Plex Mono', monospace;
  --font-content: 'IBM Plex Mono', monospace;
  --font-mono: 'IBM Plex Mono', monospace;

  /* ─── Layout Spacing ─────────────────────────────────────────────────────── */
  --spacing-screen: 30px;
  --spacing-standard: 20px;
  --spacing-large: 40px;
  --spacing-small: 12px;
}

/* ─── Custom CSS Overrides (Add your own custom rules below) ───────────────── */

/* Example: Add glowing border to cards */
/*
.ant-card {
  border: 1px solid var(--color-secondary) !important;
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.05) !important;
}
*/
`;
    }

    public exportThemeTemplateFile(): void {
        const css = this.getThemeTemplateCss();
        const blob = new Blob([css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lucy-theme.template.css';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export const themeService = ThemeService.getInstance();
