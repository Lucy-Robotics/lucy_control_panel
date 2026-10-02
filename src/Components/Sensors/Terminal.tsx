/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'antd';
import {
  fonts,
} from '../../Constants/theme';

export interface TerminalProps {
  dataSourceId?: string;
  sourceName?: string;
  data?: string[];
  lines?: string[];
  logs?: string[];
}

export const Terminal: React.FC<TerminalProps> = ({
  sourceName = 'Terminal',
  data,
  lines,
  logs,
}) => {
  const activeLogs = logs ?? lines ?? data ?? [];
  const [displayData, setDisplayData] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused) {
      setDisplayData(activeLogs);
    }
  }, [activeLogs, isPaused]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayData]);

  return (
    <div
      className="tui-container"
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--color-highlight)', fontWeight: 'bold' }}>&gt;</span>
          <span style={{ color: 'var(--color-text-primary)', fontFamily: fonts.title, fontWeight: 'bold', fontSize: 13 }}>
            {sourceName.toUpperCase()}
          </span>
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: fonts.mono, fontSize: 11, marginLeft: 4 }}>
            CONSOLE LOG
          </span>
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
            {isPaused ? '[PAUSED]' : displayData.length > 0 ? '[STREAMING]' : '[IDLE]'}
          </span>
          <Button
            size="small"
            onClick={() => setIsPaused(!isPaused)}
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
        ref={terminalRef}
        className="chamfer-box-sm"
        style={{
          height: '280px',
          overflowY: 'auto',
          padding: '12px',
          fontFamily: fonts.mono,
          lineHeight: 1.6,
          '--box-bg': 'var(--color-main)',
        } as React.CSSProperties}
      >
        {displayData.length > 0 ? (
          displayData.map((line, index) => (
            <div key={index} style={{ fontSize: '12px', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--color-highlight)', fontWeight: 'bold', userSelect: 'none' }}>&gt;</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{line}</span>
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontStyle: 'italic', padding: '4px 0' }}>
            No terminal output available.
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;
