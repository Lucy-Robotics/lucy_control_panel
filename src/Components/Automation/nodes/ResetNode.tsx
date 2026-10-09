/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { UndoOutlined, LoadingOutlined, CheckCircleFilled, AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import type { ResetNodeData } from '../types/automation.types';

const RESET_COLOR = '#B37FEB'; // Lavender / Purple

export const ResetNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as ResetNodeData;
  const isRunning = nodeData.status === 'running';
  const isCompleted = nodeData.status === 'completed';

  const scopeBadge = () => {
    switch (nodeData.scope) {
      case 'category':
        return { label: 'CATEGORY', icon: <AppstoreOutlined style={{ fontSize: 10 }} /> };
      case 'joint':
        return { label: 'JOINT', icon: <SettingOutlined style={{ fontSize: 10 }} /> };
      case 'all':
      default:
        return { label: 'ALL JOINTS', icon: <UndoOutlined style={{ fontSize: 10 }} /> };
    }
  };

  const badge = scopeBadge();

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
          backgroundColor: RESET_COLOR,
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
          background: 'rgba(179, 127, 235, 0.08)',
          borderBottom: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.5))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <UndoOutlined style={{ color: RESET_COLOR, fontSize: 14 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1px',
              color: RESET_COLOR,
              textTransform: 'uppercase',
            }}
          >
            RESET
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: RESET_COLOR,
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
              <span style={{ fontSize: 9, fontWeight: 600 }}>RESETTING</span>
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
          {nodeData.label || 'Reset'}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            backgroundColor: 'rgba(179, 127, 235, 0.12)',
            border: '1px solid rgba(179, 127, 235, 0.3)',
            borderRadius: 4,
            fontSize: 11,
            color: RESET_COLOR,
            fontWeight: 600,
          }}
        >
          {nodeData.scope === 'all' && <span>Entire Robot (All)</span>}
          {nodeData.scope === 'category' && (
            <span>Category: {nodeData.category || 'All'}</span>
          )}
          {nodeData.scope === 'joint' && (
            <span>Joint: {nodeData.jointName || 'Selected'}</span>
          )}
        </div>
      </div>

      {/* Source output handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 14,
          height: 14,
          backgroundColor: RESET_COLOR,
          border: '2px solid var(--color-main)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
