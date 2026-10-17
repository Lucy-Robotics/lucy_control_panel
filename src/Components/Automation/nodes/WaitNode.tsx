/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ClockCircleOutlined, LoadingOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { WaitNodeData } from '../types/automation.types';

const WAIT_COLOR = '#FFAA00';

export const WaitNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as WaitNodeData;
  const isRunning = nodeData.status === 'running';
  const isCompleted = nodeData.status === 'completed';

  return (
    <div
      style={{
        width: 250,
        backgroundColor: 'var(--color-main, #141414)',
        border: `1.5px solid ${
          isRunning
            ? 'var(--color-highlight)'
            : selected
            ? 'var(--color-highlight)'
            : 'var(--color-secondary)'
        }`,
        borderRadius: 8,
        boxShadow: isRunning
          ? '0 0 16px rgba(0, 255, 65, 0.45), inset 0 0 8px rgba(0, 255, 65, 0.15)'
          : selected
          ? '0 0 14px rgba(0, 255, 65, 0.3)'
          : '0 4px 14px rgba(0, 0, 0, 0.45)',
        transition: 'all 0.25s ease',
        overflow: 'hidden',
        fontFamily: 'var(--font-content)',
        cursor: 'pointer',
      }}
    >
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 14,
          height: 14,
          backgroundColor: WAIT_COLOR,
          border: '2px solid var(--color-main)',
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(255, 170, 0, 0.08)',
          borderBottom: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.5))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ClockCircleOutlined style={{ color: WAIT_COLOR, fontSize: 14 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1px',
              color: WAIT_COLOR,
              textTransform: 'uppercase',
            }}
          >
            WAIT
          </span>
        </div>

        {/* Status indicator */}
        <div>
          {isRunning && (
            <span style={{ color: 'var(--color-highlight)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LoadingOutlined spin />
              <span style={{ fontSize: 9, fontWeight: 600 }}>ACTIVE</span>
            </span>
          )}
          {isCompleted && (
            <CheckCircleFilled style={{ color: 'var(--color-highlight)', fontSize: 12 }} />
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 6,
            wordBreak: 'break-word',
            lineHeight: 1.3,
          }}
          title={nodeData.label}
        >
          {nodeData.label || 'Wait'}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            backgroundColor: 'rgba(255, 170, 0, 0.12)',
            border: '1px solid rgba(255, 170, 0, 0.3)',
            borderRadius: 4,
            fontSize: 11,
            color: WAIT_COLOR,
            fontWeight: 600,
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 10 }} />
          <span>
            {nodeData.duration} {nodeData.unit || 's'}
          </span>
        </div>

        {nodeData.description && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--color-text-secondary)',
              marginTop: 6,
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {nodeData.description}
          </div>
        )}
      </div>

      {/* Source output handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 14,
          height: 14,
          backgroundColor: WAIT_COLOR,
          border: '2px solid var(--color-main)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
