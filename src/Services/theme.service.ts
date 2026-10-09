/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
    injectThemeVariables,
} from '../Constants/theme';
import {
    BUILTIN_THEMES,
    type ThemePreset,
} from '../Constants/builtinThemes';
import { LUCY_THEME_TEMPLATE_CSS } from '../Constants/themeTemplate';
import {
    cssSecurityService,
    type CssSecurityInspectionResult,
    type FetchCssResult,
    type SecurityPolicyOptions,
    SecurityInspectionError,
} from './cssSecurity.service';

export { BUILTIN_THEMES, type ThemePreset };

export const THEME_STORAGE_KEYS = {
    ACTIVE_THEME: 'lucy_active_theme_id',
    CUSTOM_CSS: 'lucy_custom_theme_css',
    THEME_ENABLED: 'lucy_custom_theme_enabled',
    THEME_URL: 'lucy_theme_url',
} as const;

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
        const css = `:root {
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

        // Baseline: Always apply canonical default CSS variables first
        injectThemeVariables(root);

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

        if (sanitizedCss) {
            const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;!}\n\r]+)/g;
            let match;
            while ((match = varRegex.exec(sanitizedCss)) !== null) {
                const varName = match[1].trim();
                const varValue = match[2].trim();
                root.style.setProperty(varName, varValue);
            }
        }

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

        document.body.style.backgroundColor = colors.main;
    }

    public getThemeTemplateCss(): string {
        return LUCY_THEME_TEMPLATE_CSS;
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
