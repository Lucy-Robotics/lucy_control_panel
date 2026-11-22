/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Button, Card, Space } from 'antd';
import { HomeOutlined, TableOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../Constants/routes.ts';
import { fonts, fontSizes } from '../../../Constants/theme.ts';
import type { CalibrationTeaser } from './calibrationTeaser.ts';

const title: React.CSSProperties = {
    margin: 0,
    color: 'var(--color-text-primary)',
    fontFamily: fonts.title,
    fontSize: fontSizes.h3,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '0.5px',
    textWrap: 'balance',
};

const prefix: React.CSSProperties = {
    color: 'var(--color-highlight)',
    fontFamily: fonts.mono,
    marginRight: 8,
    userSelect: 'none',
};

const flatButton: React.CSSProperties = {
    background: 'transparent',
    borderColor: 'var(--color-line)',
    color: 'var(--color-text-primary)',
    borderRadius: 0,
};

/** The 404 page's lighter sibling, shown in place of the Calibrate wizard. */
export const CalibrationTeaserPage: React.FC<{
    teaser: CalibrationTeaser;
    onManualConfiguration: () => void;
}> = ({ teaser, onManualConfiguration }) => {
    const navigate = useNavigate();
    return (
        <div
            data-testid="calibration-teaser"
            data-kind={teaser.kind}
            style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
            <Card bordered className="hud-corners" style={{ width: 'min(100%, 760px)' }}>
                <h1 style={title}>
                    <span aria-hidden style={prefix}>&gt;</span>
                    <span data-testid="calibration-teaser-message">{teaser.message}</span>
                </h1>
                <Space wrap size="middle" style={{ marginTop: 32 }}>
                    <Button
                        type="primary"
                        icon={<HomeOutlined />}
                        onClick={() => navigate(ROUTES.control)}
                        style={{
                            background: 'var(--color-highlight-fill, var(--color-highlight))',
                            borderColor: 'var(--color-highlight-fill, var(--color-highlight))',
                            color: 'var(--color-text-on-highlight)',
                            fontWeight: 'bold',
                            borderRadius: 0,
                        }}
                    >
                        RETURN HOME
                    </Button>
                    <Button icon={<TableOutlined />} onClick={onManualConfiguration} style={flatButton}>
                        MANUAL CONFIGURATION
                    </Button>
                </Space>
            </Card>
        </div>
    );
};
