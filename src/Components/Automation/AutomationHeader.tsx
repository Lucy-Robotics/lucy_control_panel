/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Button, Space, Tag, Switch, Tooltip, Input, Progress } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StopOutlined,
  SyncOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  BranchesOutlined,
  EyeOutlined,
} from '@ant-design/icons';

interface AutomationHeaderProps {
  flowName: string;
  onFlowNameChange: (name: string) => void;
  isRunning: boolean;
  isPaused: boolean;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpenSaveModal: () => void;
  onOpenLoadModal: () => void;
  onToggle3DView: () => void;
  is3DViewOpen: boolean;
  currentStepIndex: number;
  totalSteps: number;
  isConnected: boolean;
  onToggleConsole: () => void;
  isConsoleOpen: boolean;
}

export const AutomationHeader: React.FC<AutomationHeaderProps> = ({
  flowName,
  onFlowNameChange,
  isRunning,
  isPaused,
  loop,
  onLoopChange,
  onStart,
  onPause,
  onResume,
  onStop,
  onOpenSaveModal,
  onOpenLoadModal,
  onToggle3DView,
  is3DViewOpen,
  currentStepIndex,
  totalSteps,
  isConnected,
  onToggleConsole,
  isConsoleOpen,
}) => {
  const percent =
    totalSteps > 0 && currentStepIndex >= 0
      ? Math.round(((currentStepIndex + 1) / totalSteps) * 100)
      : isRunning
        ? 100
        : 0;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-main)',
        borderBottom: '1px solid var(--color-secondary)',
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Left: Flow Title and Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BranchesOutlined style={{ color: 'var(--color-highlight)', fontSize: 20 }} />
            <Input
              value={flowName}
              onChange={(e) => onFlowNameChange(e.target.value)}
              variant="borderless"
              style={{
                fontFamily: 'var(--font-title, monospace)',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--color-text-primary)',
                padding: '2px 6px',
                width: 200,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 4,
              }}
              placeholder="Flow Name"
            />
          </div>

          {/* Status Badge */}
          {isRunning ? (
            <Tag
              color="processing"
              icon={<SyncOutlined spin />}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                margin: 0,
                backgroundColor: 'rgba(0, 255, 65, 0.15)',
                borderColor: 'var(--color-highlight)',
                color: 'var(--color-highlight)',
                fontWeight: 700,
              }}
            >
              RUNNING (STEP {currentStepIndex + 1}/{totalSteps})
            </Tag>
          ) : isPaused ? (
            <Tag
              color="warning"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                margin: 0,
                fontWeight: 700,
              }}
            >
              PAUSED (STEP {currentStepIndex + 1})
            </Tag>
          ) : (
            <Tag
              style={{
                fontSize: 11,
                padding: '2px 8px',
                margin: 0,
                backgroundColor: 'rgba(43, 62, 80, 0.3)',
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-text-secondary)',
                fontWeight: 600,
              }}
            >
              IDLE ({totalSteps} STEPS)
            </Tag>
          )}
        </div>

        {/* Right: Controls (Play, Pause, Stop, Loop, 3D View, Save/Load, Console) */}
        <Space size={10} wrap>
          {/* 3D View Modal Toggle Button */}
          <Tooltip title="Open 3D Viewer to visualize robot motions">
            <Button
              icon={<EyeOutlined />}
              onClick={onToggle3DView}
              style={{
                backgroundColor: is3DViewOpen ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                borderColor: is3DViewOpen ? 'var(--color-highlight)' : 'var(--color-secondary)',
                color: is3DViewOpen ? 'var(--color-highlight)' : 'var(--color-text-primary)',
                fontWeight: 600,
              }}
            >
              3D VIEW
            </Button>
          </Tooltip>

          {/* Loop toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              backgroundColor: 'rgba(25, 25, 25, 0.6)',
              border: '1px solid var(--color-secondary)',
              borderRadius: 4,
            }}
          >
            <SyncOutlined style={{ fontSize: 12, color: loop ? 'var(--color-highlight)' : 'var(--color-text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>LOOP</span>
            <Switch
              size="small"
              checked={loop}
              onChange={onLoopChange}
              disabled={isRunning}
            />
          </div>

          {/* Execution action buttons */}
          {!isRunning ? (
            <Button
              type="primary"
              icon={<CaretRightOutlined style={{ fontSize: 15 }} />}
              onClick={onStart}
              disabled={totalSteps === 0}
              style={{
                backgroundColor: 'var(--color-highlight)',
                borderColor: 'var(--color-highlight)',
                color: 'var(--color-text-on-highlight)',
                fontWeight: 700,
                height: 32,
                boxShadow: '0 0 12px rgba(0, 255, 65, 0.35)',
              }}
            >
              RUN AUTOMATION
            </Button>
          ) : (
            <Space size={6}>
              {isPaused ? (
                <Button
                  type="primary"
                  icon={<CaretRightOutlined />}
                  onClick={onResume}
                  style={{
                    backgroundColor: 'var(--color-highlight)',
                    borderColor: 'var(--color-highlight)',
                    color: 'var(--color-text-on-highlight)',
                    fontWeight: 700,
                  }}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  icon={<PauseOutlined />}
                  onClick={onPause}
                  style={{
                    borderColor: '#FFAA00',
                    color: '#FFAA00',
                    backgroundColor: 'transparent',
                  }}
                >
                  Pause
                </Button>
              )}

              <Button
                danger
                icon={<StopOutlined />}
                onClick={onStop}
                style={{
                  backgroundColor: 'transparent',
                }}
              >
                Stop
              </Button>
            </Space>
          )}

          {/* Save Routine */}
          <Tooltip title="Save current routine with a name">
            <Button
              icon={<SaveOutlined />}
              onClick={onOpenSaveModal}
              disabled={totalSteps === 0}
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Save
            </Button>
          </Tooltip>

          {/* Load Routine */}
          <Tooltip title="Load a saved routine">
            <Button
              icon={<FolderOpenOutlined />}
              onClick={onOpenLoadModal}
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Load
            </Button>
          </Tooltip>

          {/* Toggle Logs Console */}
          <Button
            onClick={onToggleConsole}
            style={{
              backgroundColor: isConsoleOpen ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
              borderColor: isConsoleOpen ? 'var(--color-highlight)' : 'var(--color-secondary)',
              color: isConsoleOpen ? 'var(--color-highlight)' : 'var(--color-text-primary)',
              fontSize: 12,
            }}
          >
            Console
          </Button>
        </Space>
      </div>

      {/* Progress Bar (visible during run) */}
      {isRunning && (
        <Progress
          percent={percent}
          size={['100%', 3]}
          showInfo={false}
          strokeColor="var(--color-highlight)"
          trailColor="rgba(43, 62, 80, 0.4)"
          style={{ margin: 0, position: 'absolute', bottom: -1, left: 0, right: 0 }}
        />
      )}
    </div>
  );
};
