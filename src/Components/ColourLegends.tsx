/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import { UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { effortLegendGradient, legendPosition, temperatureLegendGradient, TEMPERATURE_LEGEND_CELSIUS } from '../Utils/colourLegends';
import { FULL_HEAT_LOAD } from '../Utils/jointEffort.utils';
import { COOL_MOTOR_CELSIUS } from '../Utils/motorTemperatureColor';
import { HARD_LIMIT_CELSIUS, OVERHEAT_CELSIUS } from '../Utils/motorOverheat.utils';

const BAR: React.CSSProperties = { position: 'relative', width: 260, height: 10, marginBottom: 14 };
const TICK: React.CSSProperties = { position: 'absolute', top: 11, transform: 'translateX(-50%)', fontSize: 9, color: UI_TEXT_SECONDARY_MUTED };
const TITLE: React.CSSProperties = { fontSize: 10, color: UI_TEXT_SECONDARY_MUTED, marginBottom: 2 };

const Legend: React.FC<{ title: string; background: string; ticks: { at: string; label: string }[] }> = ({ title, background, ticks }) => (
    <div>
        <div style={TITLE}>{title}</div>
        <div role="img" aria-label={title} style={{ ...BAR, background }}>
            {ticks.map(({ at, label }) => <span key={label} style={{ ...TICK, left: at }}>{label}</span>)}
        </div>
    </div>
);

const { min, max } = TEMPERATURE_LEGEND_CELSIUS;
const TEMPERATURE_TICKS = [COOL_MOTOR_CELSIUS, OVERHEAT_CELSIUS, HARD_LIMIT_CELSIUS].map((celsius) => ({
    at: legendPosition(celsius, min, max),
    label: `${celsius} °C`,
}));
const EFFORT_TICKS = [0, 0.1, 0.2, 0.3, FULL_HEAT_LOAD].map((load) => ({
    at: legendPosition(load, 0, FULL_HEAT_LOAD),
    label: `${Math.round(load * 100)}%`,
}));

export const ColourLegends: React.FC = () => {
    const temperature = useMemo(temperatureLegendGradient, []);
    const effort = useMemo(effortLegendGradient, []);
    return (
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <Legend title="MOTOR TEMPERATURE" background={temperature} ticks={TEMPERATURE_TICKS} />
            <Legend title="EFFORT HEAT MAP (LOAD)" background={effort} ticks={EFFORT_TICKS} />
        </div>
    );
};
