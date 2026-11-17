/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef, useState } from 'react';
import { Card, Switch, Typography } from 'antd';
import { EyeLedsHandler } from '../../Services/ros/handlers/EyeLeds.handler';
import { RobotDescriptionHandler } from '../../Services/ros/handlers/RobotDescription.handler';
import { eyeColors, hasEyeLeds, hexToRgb, LEDS_PER_EYE, rgbToHex } from '../../Utils/eyeLeds.utils';
import { UI_BORDER_SOFT, UI_TEXT_PRIMARY_ON_DARK, UI_TEXT_SECONDARY_MUTED } from '../../Constants/uiTheme.ts';

const { Text } = Typography;
const EYES = [['left', 'Left eye'], ['right', 'Right eye']] as const;
type Eye = (typeof EYES)[number][0];
const WHITE = 0xffffff;

export const EyeColorControls = ({ disabled }: { disabled: boolean }) => {
    const [shown, setShown] = useState(false);
    const [colors, setColors] = useState<readonly number[]>([]);
    const lastLit = useRef<Record<Eye, number>>({ left: WHITE, right: WHITE });

    useEffect(() => RobotDescriptionHandler.getInstance().subscribe(urdf => setShown(hasEyeLeds(urdf))), []);
    useEffect(() => EyeLedsHandler.getInstance().subscribe(setColors), []);

    if (!shown) return null;
    const current: Record<Eye, number> = {
        left: (colors[0] ?? 0) & WHITE,
        right: (colors[colors.length > LEDS_PER_EYE ? LEDS_PER_EYE : 0] ?? 0) & WHITE,
    };
    const set = (eye: Eye, rgb: number) => {
        if (rgb !== 0) lastLit.current[eye] = rgb;
        const next = { ...current, [eye]: rgb };
        EyeLedsHandler.getInstance().publish(eyeColors(next.left, next.right));
    };

    return EYES.map(([eye, label]) => {
        const lit = current[eye] !== 0;
        const shownColor = lit ? current[eye] : lastLit.current[eye];
        return (
            <Card key={eye} size="small" className="joint-control-card" style={{ marginBottom: 8 }} styles={{ body: { padding: 12 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: '12px' }}>{label}</Text>
                    <Switch
                        size="small"
                        aria-label={`${label} on`}
                        checked={lit}
                        disabled={disabled}
                        onChange={on => set(eye, on ? lastLit.current[eye] : 0)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: lit ? 1 : 0.4 }}>
                    <input
                        type="color"
                        aria-label={`${label} color`}
                        value={rgbToHex(shownColor)}
                        disabled={disabled}
                        onChange={event => set(eye, hexToRgb(event.target.value))}
                        style={{ flex: 1, height: 24, padding: 0, background: 'transparent', border: `1px solid ${UI_BORDER_SOFT}`, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                        {rgbToHex(shownColor)}
                    </span>
                </div>
            </Card>
        );
    });
};
