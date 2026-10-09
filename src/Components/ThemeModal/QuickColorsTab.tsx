/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Typography, message } from 'antd';
import { ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    fonts,
} from '../../Constants/theme';

const { Text } = Typography;

function normalizeHex(color: string, fallback: string): string {
    if (!color) return fallback;
    const clean = color.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
    if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
        return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
    }
    return fallback;
}

interface QuickColorsTabProps {
    activeColors?: {
        main: string;
        secondary: string;
        highlight: string;
        text: string;
    };
    onApplyColors: (colors: {
        main: string;
        secondary: string;
        highlight: string;
        text: string;
        textSecondary: string;
    }) => void;
}

export const QuickColorsTab: React.FC<QuickColorsTabProps> = ({
    activeColors,
    onApplyColors,
}) => {
    const [colorMain, setColorMain] = useState(activeColors?.main || MAIN_COLOR);
    const [colorSecondary, setColorSecondary] = useState(activeColors?.secondary || SECONDARY_COLOR);
    const [colorHighlight, setColorHighlight] = useState(activeColors?.highlight || HIGHLIGHT_COLOR);
    const [colorText, setColorText] = useState(activeColors?.text || TEXT_PRIMARY);
    const [colorTextSecondary, setColorTextSecondary] = useState(TEXT_SECONDARY);

    useEffect(() => {
        if (activeColors) {
            setColorMain(activeColors.main || MAIN_COLOR);
            setColorSecondary(activeColors.secondary || SECONDARY_COLOR);
            setColorHighlight(activeColors.highlight || HIGHLIGHT_COLOR);
            setColorText(activeColors.text || TEXT_PRIMARY);
        }
    }, [activeColors]);

    const handleApply = () => {
        onApplyColors({
            main: colorMain,
            secondary: colorSecondary,
            highlight: colorHighlight,
            text: colorText,
            textSecondary: colorTextSecondary,
        });
        message.success('Colors applied successfully to control panel');
    };

    const handleReset = () => {
        setColorMain(MAIN_COLOR);
        setColorSecondary(SECONDARY_COLOR);
        setColorHighlight(HIGHLIGHT_COLOR);
        setColorText(TEXT_PRIMARY);
        setColorTextSecondary(TEXT_SECONDARY);
        onApplyColors({
            main: MAIN_COLOR,
            secondary: SECONDARY_COLOR,
            highlight: HIGHLIGHT_COLOR,
            text: TEXT_PRIMARY,
            textSecondary: TEXT_SECONDARY,
        });
        message.success('Colors reset to default Lucy theme');
    };

    const colorFields = [
        {
            title: 'MAIN BACKGROUND',
            subtitle: '75% dominant background for panels, canvas & layout',
            value: colorMain,
            fallback: MAIN_COLOR,
            setter: setColorMain,
        },
        {
            title: 'SECONDARY / BORDERS',
            subtitle: '10% framing for borders, dividers & chamfer cuts',
            value: colorSecondary,
            fallback: SECONDARY_COLOR,
            setter: setColorSecondary,
        },
        {
            title: 'HIGHLIGHT ACCENT',
            subtitle: '15% brand identifier, active sliders & cues',
            value: colorHighlight,
            fallback: HIGHLIGHT_COLOR,
            setter: setColorHighlight,
        },
        {
            title: 'PRIMARY TEXT',
            subtitle: 'High-readability warm parchment text (#F7F1E5)',
            value: colorText,
            fallback: TEXT_PRIMARY,
            setter: setColorText,
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
                    Pick common brand colors below. Lucy uses a 75% - 10% - 15% color system to maintain high contrast.
                </Text>
                <Space>
                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleReset}
                        style={{ color: TEXT_PRIMARY }}
                    >
                        Reset to Default Colors
                    </Button>
                </Space>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 12,
                }}
            >
                {colorFields.map((field) => (
                    <div
                        key={field.title}
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
                                {field.title}
                            </div>
                            <div style={{ color: TEXT_SECONDARY, fontSize: 11 }}>
                                {field.subtitle}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="color"
                                value={normalizeHex(field.value, field.fallback)}
                                onChange={(e) => field.setter(e.target.value)}
                                style={{
                                    width: 32,
                                    height: 30,
                                    padding: 0,
                                    cursor: 'pointer',
                                    border: '1px solid var(--color-secondary)',
                                    backgroundColor: 'transparent',
                                }}
                                title={`Pick ${field.title}`}
                            />
                            <Input
                                value={field.value}
                                onChange={(e) => field.setter(e.target.value)}
                                style={{ width: 90, fontFamily: fonts.mono, fontSize: 12 }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Palette Preview Box */}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={handleApply}
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
    );
};
