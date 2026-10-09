/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { Button, Input, Space, Typography, Upload, Divider, message } from 'antd';
import {
    UploadOutlined,
    DownloadOutlined,
    LinkOutlined,
    CheckOutlined,
    CopyOutlined,
    SafetyCertificateOutlined,
    SecurityScanOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { TEXT_PRIMARY, TEXT_SECONDARY, fonts } from '../../Constants/theme';
import {
    SecurityInspectionError,
    type CssSecurityInspectionResult,
    type FetchCssResult,
} from '../../Services/cssSecurity.service';
import { SecurityViolationAlert, type SecurityAlertData } from './SecurityViolationAlert';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AdvancedCssTabProps {
    customCss: string;
    onApplyCss: (css: string) => void;
    onClearCss: () => void;
    onInspectCss: (css: string) => CssSecurityInspectionResult;
    onLoadUrl: (url: string) => Promise<FetchCssResult>;
    onLoadFile: (file: File) => Promise<string>;
    onExportTemplate: () => void;
    defaultPresetCss?: string;
}

export const AdvancedCssTab: React.FC<AdvancedCssTabProps> = ({
    customCss,
    onApplyCss,
    onClearCss,
    onInspectCss,
    onLoadUrl,
    onLoadFile,
    onExportTemplate,
    defaultPresetCss,
}) => {
    const [editingCss, setEditingCss] = useState(customCss);
    const [urlInput, setUrlInput] = useState('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [isScanningCss, setIsScanningCss] = useState(false);
    const [securityAlert, setSecurityAlert] = useState<SecurityAlertData | null>(null);

    React.useEffect(() => {
        setEditingCss(customCss);
    }, [customCss]);

    const handleApply = () => {
        const inspection = onInspectCss(editingCss);
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
        onApplyCss(editingCss);
    };

    const handleAudit = () => {
        setIsScanningCss(true);
        try {
            const inspection = onInspectCss(editingCss);
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

    const handleFetchUrl = async () => {
        if (!urlInput.trim()) {
            message.warning('Please enter a valid CSS URL');
            return;
        }
        setIsLoadingUrl(true);
        setSecurityAlert(null);
        try {
            const result = await onLoadUrl(urlInput);
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
            const content = await onLoadFile(file);
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
        return false;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SecurityViolationAlert alert={securityAlert} onClose={() => setSecurityAlert(null)} />

            {/* Drag and Drop File Upload */}
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

            {/* Remote URL Loader */}
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
                        onPressEnter={handleFetchUrl}
                        style={{ backgroundColor: 'var(--color-main)', color: TEXT_PRIMARY }}
                    />
                    <Button
                        type="primary"
                        loading={isLoadingUrl}
                        icon={<SafetyCertificateOutlined />}
                        onClick={handleFetchUrl}
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
                <Text style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
                    Advanced CSS Editor: directly edit rules below.
                </Text>
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
                            onClearCss();
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
                            onClick={handleAudit}
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
                            onClick={handleApply}
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

            {/* Template Download Kit */}
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
                        onClick={onExportTemplate}
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
                            navigator.clipboard.writeText(defaultPresetCss || '');
                            message.success('Theme CSS variables copied to clipboard');
                        }}
                        style={{ color: TEXT_PRIMARY }}
                    >
                        Copy Variables to Clipboard
                    </Button>
                </div>
            </div>
        </div>
    );
};
