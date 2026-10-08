/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Button, Space, Tabs, Typography, message } from 'antd';
import {
    BgColorsOutlined,
    FileTextOutlined,
    FormatPainterOutlined,
} from '@ant-design/icons';
import { MovableModal } from './MovableModal';
import { useTheme } from '../contexts/ThemeContext';
import { ToggleSwitch } from './ToggleSwitch';
import { CustomTitle } from './CustomTitle';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '../Constants/theme';
import { PresetsTab } from './ThemeModal/PresetsTab';
import { QuickColorsTab } from './ThemeModal/QuickColorsTab';
import { AdvancedCssTab } from './ThemeModal/AdvancedCssTab';

const { Text } = Typography;

interface ThemeModalProps {
    visible: boolean;
    onClose: () => void;
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
                        {
                            key: 'presets',
                            label: (
                                <span>
                                    <BgColorsOutlined /> PRESETS
                                </span>
                            ),
                            children: (
                                <PresetsTab
                                    presets={themePresets}
                                    activeThemeId={activeThemeId}
                                    onSelectPreset={(preset) => {
                                        setActiveTheme(preset.id);
                                        message.success(`Activated theme: ${preset.name}`);
                                    }}
                                    onResetDefault={resetToDefault}
                                />
                            ),
                        },
                        {
                            key: 'quickcolors',
                            label: (
                                <span>
                                    <FormatPainterOutlined /> QUICK COLORS
                                </span>
                            ),
                            children: (
                                <QuickColorsTab
                                    activeColors={activeColors}
                                    onApplyColors={setThemeColors}
                                />
                            ),
                        },
                        {
                            key: 'css',
                            label: (
                                <span>
                                    <FileTextOutlined /> CSS THEME
                                </span>
                            ),
                            children: (
                                <AdvancedCssTab
                                    customCss={customCss}
                                    onApplyCss={setCustomCss}
                                    onClearCss={() => setCustomCss('')}
                                    onInspectCss={inspectCss}
                                    onLoadUrl={loadThemeFromUrl}
                                    onLoadFile={loadThemeFromFile}
                                    onExportTemplate={exportTemplate}
                                    defaultPresetCss={themePresets[0]?.css}
                                />
                            ),
                        },
                    ]}
                />
            </div>
        </MovableModal>
    );
};

export default ThemeModal;
