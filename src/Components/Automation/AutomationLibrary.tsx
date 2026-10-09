/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { Button, Input, Tooltip, Typography, Popconfirm } from 'antd';
import {
  ClockCircleOutlined,
  AimOutlined,
  UndoOutlined,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ClearOutlined,
  FormatPainterOutlined,
} from '@ant-design/icons';
import type { AutomationNodeType } from './types/automation.types';

const { Text } = Typography;

interface AutomationLibraryProps {
  onAddNode: (type: AutomationNodeType) => void;
  onClearCanvas: () => void;
  onAutoLayout: () => void;
  disabled?: boolean;
}

interface LibraryItem {
  type: AutomationNodeType;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    type: 'waitNode',
    title: 'Wait Node',
    badge: 'DELAY',
    description: 'Pause automation execution for a specified duration.',
    icon: <ClockCircleOutlined style={{ fontSize: 16 }} />,
    accentColor: '#FFAA00',
  },
  {
    type: 'moveNode',
    title: 'Move Node',
    badge: 'ACTUATION',
    description: 'Set target joint position, relative delta, or saved pose.',
    icon: <AimOutlined style={{ fontSize: 16 }} />,
    accentColor: 'var(--color-highlight)',
  },
  {
    type: 'resetNode',
    title: 'Reset Node',
    badge: 'CALIBRATION',
    description: 'Reset all joints, an entire category, or a single joint to rest.',
    icon: <UndoOutlined style={{ fontSize: 16 }} />,
    accentColor: '#B37FEB',
  },
];

export const AutomationLibrary: React.FC<AutomationLibraryProps> = ({
  onAddNode,
  onLoadPreset,
  onClearCanvas,
  onAutoLayout,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: AutomationNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredItems = LIBRARY_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-main)',
        borderRight: '1px solid var(--color-secondary)',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-secondary)',
          background: 'linear-gradient(180deg, rgba(43, 62, 80, 0.15) 0%, transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: 'var(--color-highlight)', fontSize: 16 }} />
            <span
              style={{
                fontFamily: 'var(--font-title, monospace)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '1px',
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase',
              }}
            >
              NODE LIBRARY
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              backgroundColor: 'rgba(0, 255, 65, 0.1)',
              color: 'var(--color-highlight)',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              borderRadius: 3,
              fontWeight: 600,
            }}
          >
            3 TYPES
          </span>
        </div>

        {/* Search */}
        <Input
          size="small"
          placeholder="Filter nodes..."
          prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{
            backgroundColor: 'var(--color-main-surface, #141414)',
            borderColor: 'var(--color-secondary)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      {/* Library Nodes List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', paddingLeft: 4 }}>
          AVAILABLE ACTIONS
        </div>

        {filteredItems.map((item) => (
          <div
            key={item.type}
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, item.type)}
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(25, 25, 25, 0.6)',
              border: '1px solid var(--color-secondary)',
              borderRadius: 6,
              cursor: disabled ? 'not-allowed' : 'grab',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="library-node-card"
          >
            {/* Color Accent Indicator Strip */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                backgroundColor: item.accentColor,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: item.accentColor }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                  {item.title}
                </span>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: item.accentColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 5px',
                  borderRadius: 3,
                }}
              >
                {item.badge}
              </span>
            </div>

            <p style={{ margin: '4px 0 8px 0', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
              {item.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                Drag to canvas
              </Text>
              <Button
                size="small"
                icon={<PlusOutlined />}
                disabled={disabled}
                onClick={() => onAddNode(item.type)}
                style={{
                  fontSize: 11,
                  height: 24,
                  padding: '0 8px',
                  borderColor: 'var(--color-secondary)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                }}
              >
                Add
              </Button>
            </div>
          </div>
        ))}

      </div>

      {/* Footer Utility Actions */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--color-secondary)',
          backgroundColor: 'var(--color-main)',
          display: 'flex',
          gap: 6,
        }}
      >
        <Tooltip title="Re-align nodes in sequential horizontal layout">
          <Button
            size="small"
            icon={<FormatPainterOutlined />}
            onClick={onAutoLayout}
            disabled={disabled}
            style={{
              flex: 1,
              fontSize: 11,
              backgroundColor: 'transparent',
              borderColor: 'var(--color-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            Auto Layout
          </Button>
        </Tooltip>

        <Popconfirm
          title="Clear canvas?"
          description="Remove all nodes and start empty?"
          onConfirm={onClearCanvas}
          okText="Clear"
          cancelText="Cancel"
          disabled={disabled}
        >
          <Tooltip title="Clear all nodes from the board">
            <Button
              size="small"
              danger
              icon={<ClearOutlined />}
              disabled={disabled}
              style={{
                fontSize: 11,
                backgroundColor: 'transparent',
              }}
            >
              Clear
            </Button>
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  );
};
