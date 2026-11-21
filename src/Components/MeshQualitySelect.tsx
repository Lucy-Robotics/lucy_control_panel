/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { MESH_QUALITIES } from '../Constants/meshQuality';
import { UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { autoMeshQuality, parseMeshQualitySetting, setMeshQualitySetting, useMeshQualitySetting } from '../hooks/useMeshQuality';

const LABELS = { full: 'Full', balanced: 'Balanced (≤1 mm)', light: 'Light (≤2 mm)' } as const;

export const MeshQualitySelect: React.FC = () => {
    const setting = useMeshQualitySetting();

    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }} title="Simplified meshes draw faster on computers without a graphics card">
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>MESH QUALITY</span>
            <select
                value={setting}
                onChange={(e) => setMeshQualitySetting(parseMeshQualitySetting(e.target.value))}
                style={{
                    width: '100%',
                    background: 'var(--color-main)',
                    border: '1px solid var(--color-line)',
                    color: UI_TEXT_PRIMARY_ON_DARK,
                    fontFamily: 'monospace',
                    fontSize: 10,
                    padding: '2px 4px',
                    borderRadius: 2,
                    cursor: 'pointer',
                }}
            >
                <option value="auto">Auto ({LABELS[autoMeshQuality()]})</option>
                {MESH_QUALITIES.map((quality) => <option key={quality} value={quality}>{LABELS[quality]}</option>)}
            </select>
        </label>
    );
};
