/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AimOutlined, LoadingOutlined, CheckCircleFilled, SwapOutlined, CameraOutlined } from '@ant-design/icons';
import type { MoveNodeData } from '../types/automation.types';

const MOVE_COLOR = '#00FF41';

export const MoveNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as MoveNodeData;
  const isRunning = nodeData.status === 'running';
  const isCompleted = nodeData.status === 'completed';

  const modeBadge = () => {
    switch (nodeData.mode) {
      case 'pose':
        return { label: 'POSE', icon: <CameraOutlined style={{ fontSize: 10 }} />, color: '#00D8FF' };
      case 'delta':
        return { label: 'DELTA', icon: <SwapOutlined style={{ fontSize: 10 }} />, color: '#FFAA00' };
      case 'target':
      default:
        return { label: 'TARGET', icon: <AimOutlined style={{ fontSize: 10 }} />, color: MOVE_COLOR };
    }
  };

  const badge = modeBadge();

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
          backgroundColor: MOVE_COLOR,
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
          background: 'rgba(0, 255, 65, 0.08)',
          borderBottom: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.5))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <AimOutlined style={{ color: MOVE_COLOR, fontSize: 14 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1px',
              color: MOVE_COLOR,
              textTransform: 'uppercase',
            }}
          >
            MOVE
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: badge.color,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {badge.icon}
            {badge.label}
          </span>
        </div>

        {/* Status indicator */}
        <div>
          {isRunning && (
            <span style={{ color: 'var(--color-highlight)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LoadingOutlined spin />
              <span style={{ fontSize: 9, fontWeight: 600 }}>MOVING</span>
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
          {nodeData.label || 'Move'}
        </div>

        {nodeData.mode === 'pose' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              backgroundColor: 'rgba(0, 216, 255, 0.12)',
              border: '1px solid rgba(0, 216, 255, 0.3)',
              borderRadius: 4,
              fontSize: 11,
              color: '#00D8FF',
              fontWeight: 600,
            }}
          >
            <CameraOutlined style={{ fontSize: 11 }} />
            <span>Pose: {nodeData.poseName || nodeData.poseId || 'Default'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-secondary)',
                wordBreak: 'break-word',
              }}
            >
              Joint: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{nodeData.jointName || 'None'}</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                backgroundColor: 'rgba(0, 255, 65, 0.12)',
                border: '1px solid rgba(0, 255, 65, 0.3)',
                borderRadius: 4,
                fontSize: 11,
                color: MOVE_COLOR,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}
            >
              {nodeData.mode === 'delta' ? (
                <span>Δ {nodeData.deltaValue > 0 ? `+${nodeData.deltaValue}` : nodeData.deltaValue}°</span>
              ) : (
                <span>Target: {nodeData.targetValue}°</span>
              )}
            </div>
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
          backgroundColor: MOVE_COLOR,
          border: '2px solid var(--color-main)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
