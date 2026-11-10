/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import type { Vec3 } from '../Utils/phoneMotion.ts';

const toMm = (metres: number) => (metres * 1000).toFixed(0).padStart(5, ' ');

const Row: React.FC<{ label: string; position: Vec3; color: string }> = ({ label, position, color }) => (
    <div style={{ display: 'flex', gap: 8, whiteSpace: 'pre' }}>
        <span style={{ color: UI_TEXT_SECONDARY_MUTED, width: 26 }}>{label}</span>
        {position.map((value, i) => (
            <span key={i} style={{ color }}>
                <span style={{ color: UI_TEXT_SECONDARY_MUTED }}>{'XYZ'[i]}</span>{toMm(value)}
            </span>
        ))}
        <span style={{ color: UI_TEXT_SECONDARY_MUTED }}>mm</span>
    </div>
);

export const EndEffectorReadout: React.FC<{ position: Vec3; target: Vec3 | null }> = ({ position, target }) => (
    <div
        className="chamfer-box viewer-overlay-box"
        aria-label="End effector position"
        style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            padding: '6px 10px',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.6,
            zIndex: 10,
            pointerEvents: 'none',
            '--frame': 'var(--color-highlight)',
        } as React.CSSProperties}
    >
        <Row label="EE" position={position} color={UI_TEXT_PRIMARY_ON_DARK} />
        {target && <Row label="TGT" position={target} color="var(--color-status-warning)" />}
    </div>
);
