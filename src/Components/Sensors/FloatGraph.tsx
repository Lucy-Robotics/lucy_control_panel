/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef } from 'react';
import { Button } from 'antd';
import type { SensorSource } from '../../Constants/rosConfig';
import {
    fonts,
} from '../../Constants/theme';
import { useSensorStream } from '../../hooks/useSensorStream';

interface FloatGraphProps {
    source: SensorSource;
}

function resolveYAxisBounds(
    historicalMin: number | null,
    historicalMax: number | null,
): { minValue: number; maxValue: number } {
    if (historicalMin === null || historicalMax === null) {
        return { minValue: 0, maxValue: 100 };
    }
    if (historicalMin === historicalMax) {
        const pad = Math.max(Math.abs(historicalMin) * 0.1, 1);
        return { minValue: historicalMin - pad, maxValue: historicalMax + pad };
    }
    const pad = (historicalMax - historicalMin) * 0.05;
    return { minValue: historicalMin - pad, maxValue: historicalMax + pad };
}

/** Live time-series graph for a single float value on a `sensors/<scope>` Float32Array topic. */
export const FloatGraph: React.FC<FloatGraphProps> = ({ source }) => {
    const graphRef = useRef<HTMLDivElement>(null);
    const {
        displaySamples,
        currentValue,
        historicalMin,
        historicalMax,
        isPaused,
        setPaused,
    } = useSensorStream(source);
    const { minValue, maxValue } = resolveYAxisBounds(historicalMin, historicalMax);

    const renderGraph = () => {
        const width = graphRef.current?.clientWidth || 300;
        const height = 280;
        const paddingLeft = 40;
        const paddingRight = 88;
        const paddingY = 24;

        const now = Date.now();
        const minTime = now - 60_000;
        const maxTime = now;

        const mapX = (time: number) =>
            paddingLeft +
            ((time - minTime) / Math.max(maxTime - minTime, 1)) *
            (width - paddingLeft - paddingRight);
        const mapY = (val: number) =>
            height -
            paddingY -
            ((val - minValue) / Math.max(maxValue - minValue, 1)) *
            (height - paddingY * 2);

        const midValue = (minValue + maxValue) / 2;
        const latest = displaySamples[displaySamples.length - 1];

        const pathData =
            displaySamples.length >= 2
                ? displaySamples
                    .map((sample, index) => {
                        const x = mapX(sample.time);
                        const y = mapY(sample.value);
                        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')
                : '';

        return (
            <svg width="100%" height={height} style={{ display: 'block' }}>
                <text
                    x={6}
                    y={paddingY + 4}
                    fill="var(--color-highlight)"
                    fontSize="11"
                    fontFamily={fonts.mono}
                >
                    {maxValue.toFixed(1)}
                </text>
                <text
                    x={6}
                    y={height - paddingY + 4}
                    fill="var(--color-highlight)"
                    fontSize="11"
                    fontFamily={fonts.mono}
                >
                    {minValue.toFixed(1)}
                </text>
                <line
                    x1={paddingLeft}
                    y1={mapY(midValue)}
                    x2={width - paddingRight}
                    y2={mapY(midValue)}
                    stroke="var(--color-secondary)"
                    strokeDasharray="4"
                />
                <text
                    x={6}
                    y={mapY(midValue) + 4}
                    fill="var(--color-secondary)"
                    fontSize="11"
                    fontFamily={fonts.mono}
                >
                    {midValue.toFixed(1)}
                </text>

                {pathData ? (
                    <path
                        d={pathData}
                        fill="none"
                        stroke="var(--color-highlight)"
                        strokeWidth="2"
                    />
                ) : null}

                {latest ? (
                    <>
                        <circle
                            cx={mapX(latest.time)}
                            cy={mapY(latest.value)}
                            r="4"
                            fill="var(--color-highlight)"
                        />
                        <text
                            x={mapX(latest.time) + 10}
                            y={mapY(latest.value) + 8}
                            fill="var(--color-highlight)"
                            fontSize="24"
                            fontFamily={fonts.mono}
                            fontWeight="bold"
                        >
                            {latest.value.toFixed(0)}
                        </text>
                    </>
                ) : currentValue !== null ? (
                    <text
                        x={width - paddingRight + 4}
                        y={height / 2}
                        fill="var(--color-highlight)"
                        fontSize="24"
                        fontFamily={fonts.mono}
                        fontWeight="bold"
                    >
                        {currentValue.toFixed(0)}
                    </text>
                ) : (
                    <text
                        x={paddingLeft}
                        y={height / 2}
                        fill="var(--color-text-secondary)"
                        fontSize="12"
                        fontFamily={fonts.mono}
                    >
                        Waiting for sensor telemetry...
                    </text>
                )}
            </svg>
        );
    };

    return (
        <div
            className="tui-container"
            ref={graphRef}
            style={{
                padding: '16px',
            }}
        >
            <div
                style={{
                    marginBottom: '12px',
                    borderBottom: '1px solid var(--color-secondary)',
                    paddingBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--color-highlight)', fontWeight: 'bold' }}>&gt;</span>
                        <span style={{ color: 'var(--color-text-primary)', fontFamily: fonts.title, fontWeight: 'bold', fontSize: 13 }}>
                            {source.name.toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)', fontFamily: fonts.mono, fontSize: 11, marginLeft: 4 }}>
                            {source.topic}
                        </span>
                    </div>
                </div>
                <div>
                    <span
                        style={{
                            marginRight: '10px',
                            color: isPaused ? 'var(--color-text-secondary)' : 'var(--color-highlight)',
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            fontWeight: 'bold',
                        }}
                    >
                        {isPaused ? '[PAUSED]' : '[LIVE]'}
                    </span>
                    <Button
                        size="small"
                        onClick={() => setPaused(!isPaused)}
                        style={{
                            borderColor: 'var(--color-secondary)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 0,
                        }}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                </div>
            </div>
            <div
                className="chamfer-box-sm"
                style={{
                    height: '280px',
                    padding: '8px 0',
                    overflow: 'hidden',
                    '--box-bg': '#0a0a0a',
                } as React.CSSProperties}
            >
                {renderGraph()}
            </div>
        </div>
    );
};

export default FloatGraph;
