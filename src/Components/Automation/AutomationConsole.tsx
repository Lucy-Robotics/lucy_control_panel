/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef, useEffect } from 'react';
import { Button, Space, Tooltip } from 'antd';
import {
  ClearOutlined,
  CloseOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ExecutionLogEntry } from './types/automation.types';

interface AutomationConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ExecutionLogEntry[];
  onClearLogs: () => void;
}

export const AutomationConsole: React.FC<AutomationConsoleProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        height: 160,
        backgroundColor: 'rgba(14, 14, 14, 0.98)',
        borderTop: '1px solid var(--color-secondary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono, monospace)',
        zIndex: 50,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Console Header */}
      <div
        style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(22, 22, 22, 0.95)',
          borderBottom: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.4))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CodeOutlined style={{ color: 'var(--color-highlight)', fontSize: 13 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}>
            EXECUTION CONSOLE
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            ({logs.length} entries)
          </span>
        </div>

        <Space size={6}>
          <Tooltip title="Clear logs">
            <Button
              size="small"
              type="text"
              icon={<ClearOutlined />}
              onClick={onClearLogs}
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', height: 22 }}
            >
              Clear
            </Button>
          </Tooltip>
          <Tooltip title="Close console">
            <Button
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', height: 22 }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Terminal Output */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontStyle: 'italic', padding: '10px 0' }}>
            Execution console ready. Press "RUN AUTOMATION" or "Test This Step" to view real-time diagnostics.
          </div>
        ) : (
          logs.map((log) => {
            const icon =
              log.level === 'success' ? (
                <CheckCircleOutlined style={{ color: 'var(--color-highlight)', fontSize: 11 }} />
              ) : log.level === 'warning' ? (
                <WarningOutlined style={{ color: '#FFAA00', fontSize: 11 }} />
              ) : log.level === 'error' ? (
                <CloseCircleOutlined style={{ color: '#FF4343', fontSize: 11 }} />
              ) : (
                <InfoCircleOutlined style={{ color: '#00D8FF', fontSize: 11 }} />
              );

            const textColor =
              log.level === 'success'
                ? 'var(--color-highlight)'
                : log.level === 'warning'
                ? '#FFAA00'
                : log.level === 'error'
                ? '#FF4343'
                : 'var(--color-text-primary)';

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', fontSize: 10, flexShrink: 0 }}>
                  [{log.timestamp}]
                </span>
                <span style={{ flexShrink: 0 }}>{icon}</span>
                <span style={{ color: textColor }}>{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
