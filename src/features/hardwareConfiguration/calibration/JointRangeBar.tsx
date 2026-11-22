/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { rangeBar } from './calibrationModel.ts';

export interface JointRangeBarProps {
    range: [number, number] | null;
    ticks: number | null;
    minSpan: number;
}

/** How much of a joint's travel has been recorded, with the mid pose and the live position. */
export const JointRangeBar: React.FC<JointRangeBarProps> = ({ range, ticks, minSpan }) => {
    const bar = rangeBar(range, ticks, minSpan);
    return (
        <div>
            <div
                role="meter"
                aria-label="Recorded joint range"
                aria-valuemin={0}
                aria-valuemax={minSpan}
                aria-valuenow={Math.min(bar.span, minSpan)}
                style={{
                    position: 'relative',
                    height: 22,
                    borderRadius: 4,
                    background: 'var(--color-main-deep)',
                    border: '1px solid var(--color-secondary)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${bar.left}%`,
                        width: `${bar.width}%`,
                        background: bar.enough ? 'var(--color-status-active)' : 'var(--color-status-warning)',
                    }}
                />
                <div
                    title="Mid pose"
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${bar.mid}%`,
                        width: 2,
                        background: 'var(--color-text-secondary)',
                    }}
                />
                {bar.tick !== null && (
                    <div
                        title="Current position"
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${bar.tick}%`,
                            width: 3,
                            background: 'var(--color-text-primary)',
                        }}
                    />
                )}
            </div>
            <div style={{ marginTop: 4, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {bar.span} of about {minSpan} ticks recorded
                {bar.enough ? ': enough' : ''}
            </div>
        </div>
    );
};
