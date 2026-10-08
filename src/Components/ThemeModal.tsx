/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    Input,
    Space,
    Tabs,
    Typography,
    Upload,
    message,
    Tooltip,
    Divider,
    Alert,
    Tag,
} from 'antd';
import {
    BgColorsOutlined,
    UploadOutlined,
    DownloadOutlined,
    LinkOutlined,
    CheckOutlined,
    CopyOutlined,
    ReloadOutlined,
    FileTextOutlined,
    FormatPainterOutlined,
    SafetyCertificateOutlined,
    SecurityScanOutlined,
    CheckCircleOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { MovableModal } from './MovableModal';
import { useTheme } from '../contexts/ThemeContext';
import { ToggleSwitch } from './ToggleSwitch';
import { CustomTitle } from './CustomTitle';
import {
    MAIN_COLOR,
    HIGHLIGHT_COLOR,
    SECONDARY_COLOR,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    fonts,
} from '../Constants/theme';
import {
    SecurityInspectionError,
    type CssViolation,
} from '../Services/cssSecurity.service';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ThemeModalProps {
    visible: boolean;
    onClose: () => void;
}

/** Ensure hex string is standard 6-char hex for <input type="color"> */
function normalizeHex(color: string, fallback: string): string {
    if (!color) return fallback;
    const clean = color.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
    if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
        return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
    }
    return fallback;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ visible, onClose }) => {
    const {
        activeThemeId,
        customCss,
        isCustomThemeEnabled,
        themePresets,
        activeColors,
        setActiveTheme,
        setCustomThemeEnabled,
        setCustomCss,
        setThemeColors,
        loadThemeFromUrl,
        loadThemeFromFile,
        inspectCss,
        resetToDefault,
        exportTemplate,
    } = useTheme();

    // Quick Colors state
    const [colorMain, setColorMain] = useState(activeColors?.main || MAIN_COLOR);
    const [colorSecondary, setColorSecondary] = useState(activeColors?.secondary || SECONDARY_COLOR);
    const [colorHighlight, setColorHighlight] = useState(activeColors?.highlight || HIGHLIGHT_COLOR);
    const [colorText, setColorText] = useState(activeColors?.text || TEXT_PRIMARY);
    const [colorTextSecondary, setColorTextSecondary] = useState(TEXT_SECONDARY);

    // CSS editor state
    const [editingCss, setEditingCss] = useState(customCss);
    const [urlInput, setUrlInput] = useState('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [isScanningCss, setIsScanningCss] = useState(false);

    // Security feedback state
    const [securityAlert, setSecurityAlert] = useState<{
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        description: string;
        violations?: CssViolation[];
    } | null>(null);

    useEffect(() => {
        if (activeColors) {
            setColorMain(activeColors.main || MAIN_COLOR);
            setColorSecondary(activeColors.secondary || SECONDARY_COLOR);
            setColorHighlight(activeColors.highlight || HIGHLIGHT_COLOR);
            setColorText(activeColors.text || TEXT_PRIMARY);
        }
    }, [activeColors]);

    useEffect(() => {
        setEditingCss(customCss);
    }, [customCss]);

    const handleApplyQuickColors = () => {
        setThemeColors({
            main: colorMain,
            secondary: colorSecondary,
            highlight: colorHighlight,
            text: colorText,
            textSecondary: colorTextSecondary,
        });
        message.success('Colors applied successfully to control panel');
    };

    const handleResetQuickColors = () => {
        setColorMain(MAIN_COLOR);
        setColorSecondary(SECONDARY_COLOR);
        setColorHighlight(HIGHLIGHT_COLOR);
        setColorText(TEXT_PRIMARY);
        setColorTextSecondary(TEXT_SECONDARY);
        setThemeColors({
            main: MAIN_COLOR,
            secondary: SECONDARY_COLOR,
            highlight: HIGHLIGHT_COLOR,
            text: TEXT_PRIMARY,
            textSecondary: TEXT_SECONDARY,
        });
        message.success('Colors reset to default Lucy theme');
    };

    const handleApplyCustomCss = () => {
        const inspection = inspectCss(editingCss);
        if (!inspection.isSafe) {
            setSecurityAlert({
                type: 'warning',
                title: 'Dangerous Rules Sanitized',
                description: `Detected ${inspection.violations.length} injection/infection pattern(s). The stylesheet was automatically sanitized to neutralize harmful vectors before DOM application.`,
                violations: inspection.violations,
            });
            message.warning('Custom CSS contained dangerous rules and was sanitized before application');
        } else {
            setSecurityAlert({
                type: 'success',
                title: 'Custom CSS Applied & Verified Safe',
                description: 'Stylesheet applied cleanly. All security inspection checks passed.',
            });
            message.success('Custom stylesheet applied');
        }
        setCustomCss(editingCss);
    };

    const handleAuditCss = () => {
        setIsScanningCss(true);
        try {
            const inspection = inspectCss(editingCss);
            if (inspection.isSafe) {
                setSecurityAlert({
                    type: 'success',
                    title: 'Security Audit Passed: No Injections Detected',
                    description: `Evaluated ${inspection.metadata.rulesEvaluated} security rules (${Math.round((inspection.metadata.cssSizeBytes / 1024) * 10) / 10} KB). No script execution, tag breakout, SSRF, or keylogger vectors detected.`,
                });
                message.success('CSS passed security audit');
            } else {
                setSecurityAlert({
                    type: 'error',
                    title: `Security Threat Detected (${inspection.threatLevel.toUpperCase()})`,
                    description: `Found ${inspection.violations.length} dangerous construct(s). In strict mode, these rules are blocked from loading into the DOM.`,
                    violations: inspection.violations,
                });
                message.error('Security violations detected in CSS editor');
            }
        } finally {
            setIsScanningCss(false);
        }
    };

    const handleLoadFromUrl = async () => {
        if (!urlInput.trim()) {
            message.warning('Please enter a valid CSS URL');
            return;
        }
        setIsLoadingUrl(true);
        setSecurityAlert(null);
        try {
            const result = await loadThemeFromUrl(urlInput);
            message.success('Theme stylesheet verified & loaded successfully from URL');
            setSecurityAlert({
                type: 'success',
                title: 'Security Verified: Remote Stylesheet Safe',
                description: `Inspected and validated ${Math.round((result.contentLength / 1024) * 10) / 10} KB from "${urlInput}". Passed XSS, SSRF, tag breakout, and CSS keylogger filters.`,
            });
            setUrlInput('');
        } catch (err: unknown) {
            if (err instanceof SecurityInspectionError) {
                setSecurityAlert({
                    type: 'error',
                    title: `Blocked Malicious Injection (${err.threatLevel.toUpperCase()})`,
                    description: err.message,
                    violations: err.violations,
                });
                message.error('CSS rejected by Security Service!');
            } else {
                const msg = err instanceof Error ? err.message : 'Failed to fetch theme';
                setSecurityAlert({
                    type: 'error',
                    title: 'URL Load Failed',
                    description: msg,
                });
                message.error(msg);
            }
        } finally {
            setIsLoadingUrl(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setSecurityAlert(null);
        try {
            const content = await loadThemeFromFile(file);
            setEditingCss(content);
            setSecurityAlert({
                type: 'success',
                title: 'File Security Verified',
                description: `Successfully inspected "${file.name}". No malicious scripts, HTML breakouts, or infections detected.`,
            });
            message.success(`Theme "${file.name}" verified and loaded successfully`);
        } catch (err: unknown) {
            if (err instanceof SecurityInspectionError) {
                setSecurityAlert({
                    type: 'error',
                    title: 'Uploaded CSS File Blocked',
                    description: err.message,
                    violations: err.violations,
                });
                message.error('File rejected: malicious injection detected');
            } else {
                const msg = err instanceof Error ? err.message : 'Failed to load theme file';
                message.error(msg);
            }
        }
        return false; // Prevent automatic antd upload POST
    };

    const handleCopyTemplate = () => {
        exportTemplate();
        message.success('Theme template downloaded');
    };

    return (
        <MovableModal
            modalName="THEMES & CUSTOM STYLING"
            isVisible={visible}
            onClose={onClose}
            initialSize={{ w: 840, h: 660 }}
            minWidth={540}
            centered
            header={<BgColorsOutlined style={{ color: 'var(--color-highlight)' }} />}
            footer={
                <Space>
                    <Button onClick={onClose} style={{ color: TEXT_PRIMARY }}>
                        CLOSE
                    </Button>
                    <Button
                        type="primary"
                        onClick={onClose}
                        style={{
                            backgroundColor: 'var(--color-highlight)',
                            borderColor: 'var(--color-highlight)',
                            color: 'var(--color-text-on-highlight)',
                            fontWeight: 'bold',
                        }}
                    >
                        DONE
                    </Button>
                </Space>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header overview & Enable switch */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'rgba(43, 62, 80, 0.25)',
                        border: '1px solid var(--color-secondary)',
                    }}
                >
                    <div>
                        <CustomTitle title="THEME ENGINE" subtitle="CUSTOMIZATION" level={4} />
                        <Text style={{ color: TEXT_SECONDARY, display: 'block', fontSize: 12, marginTop: 4 }}>
                            Customize colors with intuitive pickers, choose curated presets, or load full CSS themes.
                        </Text>
                    </div>
                    <ToggleSwitch
                        isOn={isCustomThemeEnabled}
                        onToggle={setCustomThemeEnabled}
                        title="THEMES"
                        titlePlacement="inline"
                        width={130}
                    />
                </div>

                <Tabs
                    defaultActiveKey="presets"
                    tabBarStyle={{
                        marginBottom: 16,
                        borderBottom: '1px solid var(--color-secondary)',
                    }}
                    items={[
                        /* TAB 1: PRESETS */
                        {
                            key: 'presets',
                            label: (
                                <span>
                                    <BgColorsOutlined /> PRESETS
                                </span>
                            ),
                            children: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 12,
                                        }}
                                    >
                                        {themePresets.map((preset) => {
                                            const isActive = activeThemeId === preset.id;
                                            return (
                                                <Card
                                                    key={preset.id}
                                                    size="small"
                                                    hoverable
                                                    className={`preset-card ${isActive ? 'preset-card-active' : ''}`}
                                                    onClick={() => {
                                                        setActiveTheme(preset.id);
                                                        message.success(`Activated theme: ${preset.name}`);
                                                    }}
                                                    style={{
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <Text strong style={{ color: TEXT_PRIMARY, fontFamily: fonts.title }}>
                                                            {preset.name}
                                                        </Text>
                                                        {isActive && (
                                                            <span
                                                                style={{
                                                                    color: 'var(--color-highlight)',
                                                                    fontSize: 11,
                                                                    fontWeight: 'bold',
                                                                    border: '1px solid var(--color-highlight)',
                                                                    padding: '2px 6px',
                                                                }}
                                                            >
                                                                ACTIVE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Paragraph style={{ color: TEXT_SECONDARY, fontSize: 11, minHeight: 32, margin: '4px 0 8px' }}>
                                                        {preset.description}
                                                    </Paragraph>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                        <span style={{ fontSize: 10, color: TEXT_SECONDARY, marginRight: 4 }}>PALETTE:</span>
                                                        <Tooltip title={`Main: ${preset.colors.main}`}>
                                                            <div style={{ width: 18, height: 18, backgroundColor: preset.colors.main, border: `1px solid ${SECONDARY_COLOR}` }} />
                                                        </Tooltip>
                                                        <Tooltip title={`Secondary: ${preset.colors.secondary}`}>
                                                            <div style={{ width: 18, height: 18, backgroundColor: preset.colors.secondary, border: `1px solid ${SECONDARY_COLOR}` }} />
                                                        </Tooltip>
                                                        <Tooltip title={`Highlight: ${preset.colors.highlight}`}>
                                                            <div style={{ width: 18, height: 18, backgroundColor: preset.colors.highlight, border: `1px solid ${SECONDARY_COLOR}` }} />
                                                        </Tooltip>
                                                        <Tooltip title={`Text: ${preset.colors.text}`}>
                                                            <div style={{ width: 18, height: 18, backgroundColor: preset.colors.text, border: `1px solid ${SECONDARY_COLOR}` }} />
                                                        </Tooltip>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                        <Button
                                            icon={<ReloadOutlined />}
                                            onClick={resetToDefault}
                                            style={{ color: TEXT_PRIMARY }}
                                        >
                                            Reset to Default Theme
                                        </Button>
                                    </div>
                                </div>
                            ),
                        },

                        /* TAB 2: QUICK COLORS (Color Pickers for Non-Tech Users) */
                        {
                            key: 'quickcolors',
                            label: (
                                <span>
                                    <FormatPainterOutlined /> QUICK COLORS
                                </span>
                            ),
                            children: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
                                            Pick common brand colors below. Lucy uses a 75% - 10% - 15% color system to maintain high contrast.
                                        </Text>
                                        <Space>
                                            <Button
                                                size="small"
                                                icon={<ReloadOutlined />}
                                                onClick={handleResetQuickColors}
                                                style={{ color: TEXT_PRIMARY }}
                                            >
                                                Reset to Default Colors
                                            </Button>
                                        </Space>
                                    </div>

                                    {/* Color Pickers Grid */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                            gap: 12,
                                        }}
                                    >
                                        {/* Main Background */}
                                        <div
                                            style={{
                                                padding: '12px 14px',
                                                backgroundColor: 'rgba(20, 20, 20, 0.6)',
                                                border: '1px solid var(--color-secondary)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: TEXT_PRIMARY, fontWeight: 'bold', fontSize: 12, fontFamily: fonts.title }}>
                                                    MAIN BACKGROUND
                                                </div>
                                                <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>
                                                    75% dominant background for panels, canvas & layout
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={normalizeHex(colorMain, '#141414')}
                                                    onChange={(e) => setColorMain(e.target.value)}
                                                    style={{
                                                        width: 32,
                                                        height: 30,
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--color-secondary)',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                    title="Pick Main Background Color"
                                                />
                                                <Input
                                                    value={colorMain}
                                                    onChange={(e) => setColorMain(e.target.value)}
                                                    style={{ width: 90, fontFamily: fonts.mono, fontSize: 12 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Secondary / Borders */}
                                        <div
                                            style={{
                                                padding: '12px 14px',
                                                backgroundColor: 'rgba(20, 20, 20, 0.6)',
                                                border: '1px solid var(--color-secondary)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: TEXT_PRIMARY, fontWeight: 'bold', fontSize: 12, fontFamily: fonts.title }}>
                                                    SECONDARY / BORDERS
                                                </div>
                                                <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>
                                                    10% framing for borders, dividers & chamfer cuts
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={normalizeHex(colorSecondary, '#2B3E50')}
                                                    onChange={(e) => setColorSecondary(e.target.value)}
                                                    style={{
                                                        width: 32,
                                                        height: 30,
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--color-secondary)',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                    title="Pick Secondary Border Color"
                                                />
                                                <Input
                                                    value={colorSecondary}
                                                    onChange={(e) => setColorSecondary(e.target.value)}
                                                    style={{ width: 90, fontFamily: fonts.mono, fontSize: 12 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Highlight Accent */}
                                        <div
                                            style={{
                                                padding: '12px 14px',
                                                backgroundColor: 'rgba(20, 20, 20, 0.6)',
                                                border: '1px solid var(--color-secondary)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: TEXT_PRIMARY, fontWeight: 'bold', fontSize: 12, fontFamily: fonts.title }}>
                                                    HIGHLIGHT ACCENT
                                                </div>
                                                <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>
                                                    15% brand identifier, active sliders & cues
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={normalizeHex(colorHighlight, '#00FF41')}
                                                    onChange={(e) => setColorHighlight(e.target.value)}
                                                    style={{
                                                        width: 32,
                                                        height: 30,
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--color-secondary)',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                    title="Pick Highlight Accent Color"
                                                />
                                                <Input
                                                    value={colorHighlight}
                                                    onChange={(e) => setColorHighlight(e.target.value)}
                                                    style={{ width: 90, fontFamily: fonts.mono, fontSize: 12 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Primary Text */}
                                        <div
                                            style={{
                                                padding: '12px 14px',
                                                backgroundColor: 'rgba(20, 20, 20, 0.6)',
                                                border: '1px solid var(--color-secondary)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: TEXT_PRIMARY, fontWeight: 'bold', fontSize: 12, fontFamily: fonts.title }}>
                                                    PRIMARY TEXT
                                                </div>
                                                <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>
                                                    High-readability warm parchment text (#F7F1E5)
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={normalizeHex(colorText, '#F7F1E5')}
                                                    onChange={(e) => setColorText(e.target.value)}
                                                    style={{
                                                        width: 32,
                                                        height: 30,
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--color-secondary)',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                    title="Pick Primary Text Color"
                                                />
                                                <Input
                                                    value={colorText}
                                                    onChange={(e) => setColorText(e.target.value)}
                                                    style={{ width: 90, fontFamily: fonts.mono, fontSize: 12 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real-time Preview Panel */}
                                    <div
                                        style={{
                                            border: `1px solid ${colorSecondary}`,
                                            backgroundColor: colorMain,
                                            padding: 16,
                                            marginTop: 4,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ color: colorHighlight, fontFamily: fonts.mono, fontWeight: 'bold' }}>&gt;</span>
                                                <span style={{ color: colorText, fontFamily: fonts.title, fontWeight: 'bold', fontSize: 13 }}>
                                                    LIVE PALETTE PREVIEW
                                                </span>
                                            </div>
                                            <span style={{ color: colorHighlight, fontSize: 11, fontFamily: fonts.mono }}>
                                                [75% // 10% // 15%]
                                            </span>
                                        </div>
                                        <p style={{ color: colorTextSecondary, fontSize: 12, margin: '4px 0 12px' }}>
                                            Sample telemetry readings, chamfered cards, and interactive controls reflect these colors immediately.
                                        </p>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                style={{
                                                    backgroundColor: colorHighlight,
                                                    color: colorMain,
                                                    border: 'none',
                                                    padding: '6px 16px',
                                                    fontWeight: 'bold',
                                                    fontSize: 12,
                                                    fontFamily: fonts.mono,
                                                    cursor: 'default',
                                                }}
                                            >
                                                ACTIVE ACTION
                                            </button>
                                            <button
                                                type="button"
                                                style={{
                                                    backgroundColor: 'transparent',
                                                    color: colorText,
                                                    border: `1px solid ${colorSecondary}`,
                                                    padding: '5px 14px',
                                                    fontSize: 12,
                                                    fontFamily: fonts.mono,
                                                    cursor: 'default',
                                                }}
                                            >
                                                SECONDARY BORDER
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={handleApplyQuickColors}
                                            style={{
                                                backgroundColor: 'var(--color-highlight)',
                                                borderColor: 'var(--color-highlight)',
                                                color: 'var(--color-text-on-highlight)',
                                                fontWeight: 'bold',
                                                height: 36,
                                                padding: '0 24px',
                                            }}
                                        >
                                            APPLY QUICK COLORS
                                        </Button>
                                    </div>
                                </div>
                            ),
                        },

                        /* TAB 3: CSS THEME (File upload, Online URL, Raw CSS, and Template Export) */
                        {
                            key: 'css',
                            label: (
                                <span>
                                    <FileTextOutlined /> CSS THEME
                                </span>
                            ),
                            children: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* Security Feedback Alert */}
                                    {securityAlert && (
                                        <Alert
                                            message={securityAlert.title}
                                            description={
                                                <div>
                                                    <div style={{ marginBottom: securityAlert.violations && securityAlert.violations.length > 0 ? 8 : 0 }}>
                                                        {securityAlert.description}
                                                    </div>
                                                    {securityAlert.violations && securityAlert.violations.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                                                            {securityAlert.violations.map((violation, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                        fontSize: 11,
                                                                        backgroundColor: 'rgba(0,0,0,0.3)',
                                                                        padding: '4px 8px',
                                                                        borderRadius: 3,
                                                                    }}
                                                                >
                                                                    <Tag
                                                                        color={
                                                                            violation.severity === 'critical'
                                                                                ? 'error'
                                                                                : violation.severity === 'high'
                                                                                    ? 'warning'
                                                                                    : 'default'
                                                                        }
                                                                        style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}
                                                                    >
                                                                        {violation.severity.toUpperCase()}
                                                                    </Tag>
                                                                    <span style={{ color: TEXT_PRIMARY }}>{violation.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                            type={securityAlert.type}
                                            icon={securityAlert.type === 'success' ? <CheckCircleOutlined /> : undefined}
                                            showIcon
                                            closable
                                            onClose={() => setSecurityAlert(null)}
                                            style={{ border: '1px solid var(--color-secondary)' }}
                                        />
                                    )}

                                    {/* File Upload Section */}
                                    <div
                                        style={{
                                            border: '2px dashed var(--color-secondary)',
                                            padding: 20,
                                            textAlign: 'center',
                                            background: 'rgba(20, 20, 20, 0.6)',
                                        }}
                                    >
                                        <Upload.Dragger
                                            accept=".css"
                                            beforeUpload={handleFileUpload}
                                            showUploadList={false}
                                            style={{ background: 'transparent', border: 'none' }}
                                        >
                                            <p className="ant-upload-drag-icon">
                                                <UploadOutlined style={{ fontSize: 32, color: 'var(--color-highlight)' }} />
                                            </p>
                                            <p style={{ color: TEXT_PRIMARY, fontFamily: fonts.title, fontSize: 14, fontWeight: 'bold' }}>
                                                Drop custom theme .css file here
                                            </p>
                                            <p style={{ color: TEXT_SECONDARY, fontSize: 11, marginBottom: 8 }}>
                                                Upload any stylesheet overriding :root variables or custom classes (automatically security inspected)
                                            </p>
                                            <Button
                                                type="primary"
                                                icon={<UploadOutlined />}
                                                style={{
                                                    backgroundColor: 'var(--color-highlight)',
                                                    borderColor: 'var(--color-highlight)',
                                                    color: 'var(--color-text-on-highlight)',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                BROWSE CSS FILE
                                            </Button>
                                        </Upload.Dragger>
                                    </div>

                                    {/* Online URL Section */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <Text style={{ color: TEXT_PRIMARY, fontSize: 12, fontWeight: 'bold' }}>
                                                Direct Raw CSS URL (GitHub raw, CDN, web link):
                                            </Text>
                                            <span style={{ color: 'var(--color-highlight)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <LockOutlined /> Protected
                                            </span>
                                        </div>
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Input
                                                prefix={<LinkOutlined style={{ color: 'var(--color-highlight)' }} />}
                                                placeholder="https://raw.githubusercontent.com/.../theme.css"
                                                value={urlInput}
                                                onChange={(e) => setUrlInput(e.target.value)}
                                                onPressEnter={handleLoadFromUrl}
                                                style={{ backgroundColor: 'var(--color-main)', color: TEXT_PRIMARY }}
                                            />
                                            <Button
                                                type="primary"
                                                loading={isLoadingUrl}
                                                icon={<SafetyCertificateOutlined />}
                                                onClick={handleLoadFromUrl}
                                                style={{
                                                    backgroundColor: 'var(--color-highlight)',
                                                    borderColor: 'var(--color-highlight)',
                                                    color: 'var(--color-text-on-highlight)',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                FETCH & AUDIT
                                            </Button>
                                        </Space.Compact>
                                        <Text style={{ color: TEXT_SECONDARY, fontSize: 11, display: 'block', marginTop: 4 }}>
                                            Only secure HTTP/HTTPS endpoints are accepted. Internal private addresses (RFC1918, localhost) and oversized payloads (&gt;512KB) are strictly blocked.
                                        </Text>
                                    </div>

                                    <Divider style={{ borderColor: 'var(--color-secondary)', margin: '4px 0' }} />

                                    {/* Raw CSS Editor */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
                                                Advanced CSS Editor: directly edit rules below.
                                            </Text>
                                        </div>
                                        <TextArea
                                            rows={8}
                                            value={editingCss}
                                            onChange={(e) => setEditingCss(e.target.value)}
                                            placeholder={`:root {\n  --color-main: #0e1117;\n  --color-secondary: #30363d;\n  --color-highlight: #58a6ff;\n  --color-text-primary: #f0f6fc;\n}\n`}
                                            style={{
                                                fontFamily: fonts.mono,
                                                fontSize: 12,
                                                backgroundColor: 'var(--color-main)',
                                                borderColor: 'var(--color-secondary)',
                                                color: TEXT_PRIMARY,
                                                lineHeight: 1.5,
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Button
                                                danger
                                                onClick={() => {
                                                    setEditingCss('');
                                                    setCustomCss('');
                                                    setSecurityAlert(null);
                                                    message.info('Custom CSS cleared');
                                                }}
                                                size="small"
                                            >
                                                Clear CSS
                                            </Button>
                                            <Space>
                                                <Button
                                                    icon={<SecurityScanOutlined />}
                                                    loading={isScanningCss}
                                                    onClick={handleAuditCss}
                                                    style={{
                                                        backgroundColor: 'transparent',
                                                        borderColor: 'var(--color-secondary)',
                                                        color: TEXT_PRIMARY,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    SCAN FOR THREATS
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    icon={<CheckOutlined />}
                                                    onClick={handleApplyCustomCss}
                                                    style={{
                                                        backgroundColor: 'var(--color-highlight)',
                                                        borderColor: 'var(--color-highlight)',
                                                        color: 'var(--color-text-on-highlight)',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    APPLY CSS
                                                </Button>
                                            </Space>
                                        </div>
                                    </div>

                                    <Divider style={{ borderColor: 'var(--color-secondary)', margin: '4px 0' }} />

                                    {/* Export Theme Template Section */}
                                    <div
                                        style={{
                                            padding: 14,
                                            background: 'rgba(20, 20, 20, 0.4)',
                                            border: '1px solid var(--color-secondary)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ color: TEXT_PRIMARY, fontFamily: fonts.title, fontWeight: 'bold', fontSize: 12 }}>
                                                EXPORT THEME TEMPLATE
                                            </span>
                                            <span style={{ color: 'var(--color-highlight)', fontSize: 11, fontFamily: fonts.mono }}>
                                                BLUEPRINT KIT
                                            </span>
                                        </div>
                                        <Paragraph style={{ color: TEXT_SECONDARY, fontSize: 11, margin: '4px 0 12px' }}>
                                            Download the starter template stylesheet with documentation and tokens, or copy CSS properties directly to your clipboard.
                                        </Paragraph>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            <Button
                                                type="primary"
                                                icon={<DownloadOutlined />}
                                                onClick={handleCopyTemplate}
                                                style={{
                                                    backgroundColor: 'var(--color-highlight)',
                                                    borderColor: 'var(--color-highlight)',
                                                    color: 'var(--color-text-on-highlight)',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                DOWNLOAD THEME TEMPLATE (.CSS)
                                            </Button>
                                            <Button
                                                icon={<CopyOutlined />}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(themePresets[0]?.css || '');
                                                    message.success('Theme CSS variables copied to clipboard');
                                                }}
                                                style={{ color: TEXT_PRIMARY }}
                                            >
                                                Copy Variables to Clipboard
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </MovableModal>
    );
};

export default ThemeModal;
