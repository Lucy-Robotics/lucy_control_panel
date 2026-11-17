/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import { EyeLedsHandler } from '../../Services/ros/handlers/EyeLeds.handler';
import { RobotDescriptionHandler } from '../../Services/ros/handlers/RobotDescription.handler';
import { eyeColors, hasEyeLeds, hexToRgb, LEDS_PER_EYE, rgbToHex } from '../../Utils/eyeLeds.utils';

const EYES = [['left', 'Left eye'], ['right', 'Right eye']] as const;

export const EyeColorControls = ({ disabled }: { disabled: boolean }) => {
    const [shown, setShown] = useState(false);
    const [colors, setColors] = useState<readonly number[]>([]);

    useEffect(() => RobotDescriptionHandler.getInstance().subscribe(urdf => setShown(hasEyeLeds(urdf))), []);
    useEffect(() => EyeLedsHandler.getInstance().subscribe(setColors), []);

    if (!shown) return null;
    const current = { left: colors[0] ?? 0, right: colors[colors.length > LEDS_PER_EYE ? LEDS_PER_EYE : 0] ?? 0 };
    const pick = (eye: 'left' | 'right', hex: string) => {
        const next = { ...current, [eye]: hexToRgb(hex) };
        EyeLedsHandler.getInstance().publish(eyeColors(next.left, next.right));
    };

    return (
        <div className="eye-color-controls" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 4px 8px' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary, inherit)' }}>Eyes</span>
            {EYES.map(([eye, label]) => (
                <label key={eye} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input
                        type="color"
                        aria-label={label}
                        value={rgbToHex(current[eye])}
                        disabled={disabled}
                        onChange={event => pick(eye, event.target.value)}
                    />
                    {label}
                </label>
            ))}
        </div>
    );
};
