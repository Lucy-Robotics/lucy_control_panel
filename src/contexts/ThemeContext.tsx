/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ThemeConfig } from 'antd';
import { theme as antdThemeEngine } from 'antd';
import {
    themeService,
    BUILTIN_THEMES,
    type ThemePreset,
} from '../Services/theme.service';
import {
    cssSecurityService,
    type CssSecurityInspectionResult,
    type FetchCssResult,
    type SecurityPolicyOptions,
    type SecurityAuditRecord,
} from '../Services/cssSecurity.service';
import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    fonts,
} from '../Constants/theme';

interface ThemeContextType {
    activeThemeId: string;
    customCss: string;
    isCustomThemeEnabled: boolean;
    themeUrl: string;
    themePresets: ThemePreset[];
    activeColors: ThemePreset['colors'];
    lastSecurityReport: CssSecurityInspectionResult | null;
    securityHistory: SecurityAuditRecord[];
    setActiveTheme: (id: string) => void;
    setCustomThemeEnabled: (enabled: boolean) => void;
    setCustomCss: (css: string) => void;
    setThemeColors: (colors: { main: string; secondary: string; highlight: string; text: string; textSecondary?: string }) => void;
    loadThemeFromUrl: (url: string, policy?: SecurityPolicyOptions) => Promise<FetchCssResult>;
    loadThemeFromFile: (file: File, policy?: SecurityPolicyOptions) => Promise<string>;
    inspectCss: (css: string, policy?: SecurityPolicyOptions) => CssSecurityInspectionResult;
    resetToDefault: () => void;
    exportTemplate: () => void;
    antdThemeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeThemeId, setActiveThemeIdState] = useState<string>(() => themeService.getActiveThemeId());
    const [customCss, setCustomCssState] = useState<string>(() => themeService.getCustomCss());
    const [isCustomThemeEnabled, setCustomThemeEnabledState] = useState<boolean>(() => themeService.isCustomThemeEnabled());
    const [themeUrl, setThemeUrlState] = useState<string>(() => themeService.getThemeUrl());
    const [lastSecurityReport, setLastSecurityReport] = useState<CssSecurityInspectionResult | null>(() => themeService.getLastSecurityInspection());
    const [securityHistory, setSecurityHistory] = useState<SecurityAuditRecord[]>(() => cssSecurityService.getAuditHistory());

    useEffect(() => {
        const unsubscribe = themeService.subscribe(() => {
            setActiveThemeIdState(themeService.getActiveThemeId());
            setCustomCssState(themeService.getCustomCss());
            setCustomThemeEnabledState(themeService.isCustomThemeEnabled());
            setThemeUrlState(themeService.getThemeUrl());
            setLastSecurityReport(themeService.getLastSecurityInspection());
            setSecurityHistory(cssSecurityService.getAuditHistory());
        });
        return unsubscribe;
    }, []);

    const activeColors = useMemo(() => {
        return themeService.getActiveColors();
    }, [activeThemeId, customCss, isCustomThemeEnabled]);

    const antdThemeConfig = useMemo<ThemeConfig>(() => {
        const colors = activeColors;
        const main = colors.main || MAIN_COLOR;
        const secondary = colors.secondary || SECONDARY_COLOR;
        const highlight = colors.highlight || HIGHLIGHT_COLOR;
        const text = colors.text || TEXT_PRIMARY;

        return {
            algorithm: antdThemeEngine.darkAlgorithm,
            token: {
                colorPrimary: highlight,
                colorBgBase: main,
                colorBgContainer: main,
                colorBorder: secondary,
                colorBorderSecondary: secondary,
                colorText: text,
                colorTextSecondary: TEXT_SECONDARY,
                colorLink: highlight,
                colorLinkHover: highlight,
                fontFamily: fonts.mono,
                borderRadius: 0,
            },
            components: {
                Layout: {
                    bodyBg: main,
                    headerBg: main,
                    siderBg: main,
                },
                Card: {
                    colorBgContainer: main,
                    colorBorderSecondary: secondary,
                    borderRadiusLG: 0,
                },
                Button: {
                    colorBgContainer: 'transparent',
                    colorBorder: secondary,
                    colorText: text,
                    borderRadius: 0,
                },
                Input: {
                    colorBgContainer: main,
                    colorBorder: secondary,
                    colorText: text,
                    borderRadius: 0,
                },
                InputNumber: {
                    colorBgContainer: main,
                    colorBorder: secondary,
                    colorText: text,
                    borderRadius: 0,
                },
                Select: {
                    colorBgContainer: main,
                    colorBorder: secondary,
                    colorText: text,
                    borderRadius: 0,
                },
                Modal: {
                    contentBg: main,
                    headerBg: main,
                    titleColor: text,
                    borderRadiusLG: 0,
                },
                Table: {
                    colorBgContainer: main,
                    headerBg: main,
                    borderColor: secondary,
                    rowHoverBg: 'rgba(43, 62, 80, 0.2)',
                    borderRadius: 0,
                },
                Slider: {
                    colorPrimary: highlight,
                    trackBg: highlight,
                    trackHoverBg: highlight,
                    handleColor: highlight,
                    handleActiveColor: highlight,
                    railBg: secondary,
                    railHoverBg: secondary,
                    dotBorderColor: secondary,
                    dotActiveBorderColor: highlight,
                },
                Switch: {
                    colorPrimary: highlight,
                },
                Tag: {
                    borderRadiusSM: 0,
                },
                Alert: {
                    borderRadiusLG: 0,
                },
            },
        };
    }, [activeColors]);

    const setActiveTheme = (id: string) => {
        themeService.setActiveTheme(id);
    };

    const setCustomThemeEnabled = (enabled: boolean) => {
        themeService.setCustomThemeEnabled(enabled);
    };

    const setCustomCss = (css: string) => {
        const inspection = themeService.setCustomCss(css);
        setLastSecurityReport(inspection);
        setSecurityHistory(cssSecurityService.getAuditHistory());
    };

    const loadThemeFromUrl = async (url: string, policy?: SecurityPolicyOptions): Promise<FetchCssResult> => {
        const result = await themeService.loadThemeFromUrl(url, policy);
        setLastSecurityReport(result.inspection);
        setSecurityHistory(cssSecurityService.getAuditHistory());
        return result;
    };

    const loadThemeFromFile = async (file: File, policy?: SecurityPolicyOptions): Promise<string> => {
        const result = await themeService.loadThemeFromFile(file, policy);
        setLastSecurityReport(themeService.getLastSecurityInspection());
        setSecurityHistory(cssSecurityService.getAuditHistory());
        return result;
    };

    const inspectCss = (css: string, policy?: SecurityPolicyOptions): CssSecurityInspectionResult => {
        return cssSecurityService.inspectCss(css, policy);
    };

    const resetToDefault = () => {
        themeService.resetToDefault();
    };

    const exportTemplate = () => {
        themeService.exportThemeTemplateFile();
    };

    const setThemeColors = (colors: { main: string; secondary: string; highlight: string; text: string; textSecondary?: string }) => {
        themeService.setThemeColors(colors);
    };

    return (
        <ThemeContext.Provider
            value={{
                activeThemeId,
                customCss,
                isCustomThemeEnabled,
                themeUrl,
                themePresets: BUILTIN_THEMES,
                activeColors,
                lastSecurityReport,
                securityHistory,
                setActiveTheme,
                setCustomThemeEnabled,
                setCustomCss,
                setThemeColors,
                loadThemeFromUrl,
                loadThemeFromFile,
                inspectCss,
                resetToDefault,
                exportTemplate,
                antdThemeConfig,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
