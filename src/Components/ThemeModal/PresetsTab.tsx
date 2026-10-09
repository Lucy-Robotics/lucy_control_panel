/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Card, Typography, Tooltip, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { TEXT_PRIMARY, TEXT_SECONDARY, SECONDARY_COLOR, fonts } from '../../Constants/theme';
import type { ThemePreset } from '../../Constants/builtinThemes';

const { Text, Paragraph } = Typography;

interface PresetsTabProps {
    presets: ThemePreset[];
    activeThemeId: string;
    onSelectPreset: (preset: ThemePreset) => void;
    onResetDefault: () => void;
}

export const PresetsTab: React.FC<PresetsTabProps> = ({
    presets,
    activeThemeId,
    onSelectPreset,
    onResetDefault,
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 12,
                }}
            >
                {presets.map((preset) => {
                    const isActive = activeThemeId === preset.id;
                    return (
                        <Card
                            key={preset.id}
                            size="small"
                            hoverable
                            className={`preset-card ${isActive ? 'preset-card-active' : ''}`}
                            onClick={() => onSelectPreset(preset)}
                            style={{ cursor: 'pointer' }}
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
                    onClick={onResetDefault}
                    style={{ color: TEXT_PRIMARY }}
                >
                    Reset to Default Theme
                </Button>
            </div>
        </div>
    );
};
