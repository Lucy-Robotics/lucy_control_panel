/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import {
  Input,
  InputNumber,
  Slider,
  Select,
  Segmented,
  Button,
  Divider,
  Tag,
  Tooltip,
  Popconfirm,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  AimOutlined,
  UndoOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  CloseOutlined,
  SettingOutlined,
  CameraOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { Node } from '@xyflow/react';
import type { JointControlState } from '../../Constants/robotTypes';
import type { SavedPose } from '../../Services/storage.service';
import type {
  AutomationNodeData,
  WaitNodeData,
  MoveNodeData,
  ResetNodeData,
  MoveMode,
  ResetScope,
} from './types/automation.types';


interface AutomationConfigPanelProps {
  selectedNode: Node<AutomationNodeData> | null;
  onUpdateNodeData: (nodeId: string, partialData: Partial<AutomationNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onTestNode: (node: Node<AutomationNodeData>) => void;
  onClose: () => void;
  joints: JointControlState[];
  savedPoses: SavedPose[];
  allNodes: Node<AutomationNodeData>[];
  onSelectNode: (nodeId: string) => void;
}

export const AutomationConfigPanel: React.FC<AutomationConfigPanelProps> = ({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
  onDuplicateNode,
  onTestNode,
  onClose,
  joints,
  savedPoses,
  allNodes,
  onSelectNode,
}) => {
  const groupedJointOptions = useMemo(() => {
    const groups: Record<string, { label: string; value: string }[]> = {};
    for (const j of joints) {
      const cat = j.category || 'General';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push({
        label: j.displayName && j.displayName !== j.name ? `${j.displayName} (${j.name})` : (j.displayName || j.name),
        value: j.name,
      });
    }

    return Object.entries(groups).map(([cat, opts]) => ({
      label: cat,
      options: opts,
    }));
  }, [joints]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const j of joints) {
      if (j.category) set.add(j.category);
    }
    return Array.from(set);
  }, [joints]);

  if (!selectedNode) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--color-main)',
          borderLeft: '1px solid var(--color-secondary)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: 'var(--color-text-secondary)', fontSize: 16 }} />
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
              CONFIG INSPECTOR
            </span>
          </div>
        </div>

        {/* Empty state & Flow summary */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(25, 25, 25, 0.5)',
              border: '1px dashed var(--color-secondary)',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <InfoCircleOutlined style={{ fontSize: 24, color: 'var(--color-text-muted)', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              No Node Selected
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Click any node on the board to view and modify its properties, or drag new nodes from the library.
            </div>
          </div>

          {allNodes.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                SEQUENCE OVERVIEW ({allNodes.length} NODES)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allNodes.map((node, idx) => {
                  const isWait = node.type === 'waitNode';
                  const isMove = node.type === 'moveNode';
                  const icon = isWait ? (
                    <ClockCircleOutlined style={{ color: '#FFAA00' }} />
                  ) : isMove ? (
                    <AimOutlined style={{ color: 'var(--color-highlight)' }} />
                  ) : (
                    <UndoOutlined style={{ color: '#B37FEB' }} />
                  );

                  return (
                    <div
                      key={node.id}
                      onClick={() => onSelectNode(node.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        backgroundColor: 'rgba(20, 20, 20, 0.6)',
                        border: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.3))',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      className="sequence-overview-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                          #{idx + 1}
                        </span>
                        <span style={{ flexShrink: 0 }}>{icon}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--color-text-primary)',
                            wordBreak: 'break-word',
                            lineHeight: 1.3,
                          }}
                        >
                          {node.data.label || node.id}
                        </span>
                      </div>
                      <Tag style={{ fontSize: 9, margin: 0, flexShrink: 0 }}>
                        {isWait ? 'WAIT' : isMove ? 'MOVE' : 'RESET'}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Selected Node Details
  const nodeType = selectedNode.type;
  const isWait = nodeType === 'waitNode';
  const isMove = nodeType === 'moveNode';
  const isReset = nodeType === 'resetNode';

  const waitData = isWait ? (selectedNode.data as WaitNodeData) : null;
  const moveData = isMove ? (selectedNode.data as MoveNodeData) : null;
  const resetData = isReset ? (selectedNode.data as ResetNodeData) : null;

  // Selected joint details for Move node
  const activeJoint = moveData
    ? joints.find((j) => j.name === moveData.jointName) ?? joints[0]
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-main)',
        borderLeft: '1px solid var(--color-secondary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-secondary)',
          background: 'linear-gradient(180deg, rgba(43, 62, 80, 0.2) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isWait && <ClockCircleOutlined style={{ color: '#FFAA00', fontSize: 16 }} />}
          {isMove && <AimOutlined style={{ color: 'var(--color-highlight)', fontSize: 16 }} />}
          {isReset && <UndoOutlined style={{ color: '#B37FEB', fontSize: 16 }} />}
          <div>
            <div style={{ fontFamily: 'var(--font-title, monospace)', fontWeight: 700, fontSize: 12, color: 'var(--color-text-primary)' }}>
              {isWait ? 'WAIT CONFIG' : isMove ? 'MOVE CONFIG' : 'RESET CONFIG'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ID: {selectedNode.id}
            </div>
          </div>
        </div>

        <Tooltip title="Deselect Node">
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </Tooltip>
      </div>

      {/* Form Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Step Label */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
            STEP LABEL
          </label>
          <Input
            value={selectedNode.data.label}
            onChange={(e) => onUpdateNodeData(selectedNode.id, { label: e.target.value })}
            placeholder="Step description or name"
            style={{
              backgroundColor: 'var(--color-main-surface, #141414)',
              borderColor: 'var(--color-secondary)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* ─── WAIT NODE CONFIG ─── */}
        {isWait && waitData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  HOLD DURATION ({waitData.unit || 's'})
                </label>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFAA00' }}>
                  {waitData.duration} {waitData.unit || 's'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Slider
                  min={0.1}
                  max={waitData.unit === 'ms' ? 10000 : 30}
                  step={waitData.unit === 'ms' ? 50 : 0.1}
                  value={waitData.duration}
                  onChange={(val) => onUpdateNodeData(selectedNode.id, { duration: val })}
                  style={{ flex: 1 }}
                />
                <InputNumber
                  min={0.05}
                  max={600}
                  step={0.1}
                  value={waitData.duration}
                  onChange={(val) => val !== null && onUpdateNodeData(selectedNode.id, { duration: val })}
                  size="small"
                  style={{ width: 75 }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {[0.5, 1.0, 2.0, 5.0, 10.0].map((preset) => (
                  <Button
                    key={preset}
                    size="small"
                    onClick={() => onUpdateNodeData(selectedNode.id, { duration: preset, unit: 's' })}
                    style={{
                      fontSize: 10,
                      height: 22,
                      padding: '0 6px',
                      backgroundColor: waitData.duration === preset ? 'rgba(255, 170, 0, 0.2)' : 'transparent',
                      borderColor: waitData.duration === preset ? '#FFAA00' : 'var(--color-secondary)',
                      color: waitData.duration === preset ? '#FFAA00' : 'var(--color-text-secondary)',
                    }}
                  >
                    {preset}s
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                DURATION UNIT
              </label>
              <Segmented
                value={waitData.unit || 's'}
                options={[
                  { label: 'Seconds (s)', value: 's' },
                  { label: 'Milliseconds (ms)', value: 'ms' },
                ]}
                onChange={(val) => onUpdateNodeData(selectedNode.id, { unit: val as 's' | 'ms' })}
                block
                style={{ backgroundColor: 'rgba(25, 25, 25, 0.6)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                NOTES / COMMENTS
              </label>
              <Input.TextArea
                rows={2}
                value={waitData.description || ''}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
                placeholder="e.g. Allow arm inertia to settle"
                style={{
                  backgroundColor: 'var(--color-main-surface, #141414)',
                  borderColor: 'var(--color-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* ─── MOVE NODE CONFIG ─── */}
        {isMove && moveData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                MOVEMENT TYPE
              </label>
              <Segmented
                value={moveData.mode}
                options={[
                  { label: 'Final Target', value: 'target', icon: <AimOutlined /> },
                  { label: 'Relative Δ', value: 'delta' },
                  { label: 'Saved Pose', value: 'pose', icon: <CameraOutlined /> },
                ]}
                onChange={(val) => onUpdateNodeData(selectedNode.id, { mode: val as MoveMode })}
                block
                style={{ backgroundColor: 'rgba(25, 25, 25, 0.6)' }}
              />
            </div>

            {/* If Pose mode */}
            {moveData.mode === 'pose' ? (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  SELECT SAVED POSE
                </label>
                <Select
                  value={moveData.poseId}
                  placeholder="Select saved robot pose"
                  onChange={(val, opt: any) =>
                    onUpdateNodeData(selectedNode.id, {
                      poseId: val,
                      poseName: opt?.label ?? val,
                    })
                  }
                  options={
                    savedPoses.length > 0
                      ? savedPoses.map((p) => ({
                        label: `${p.name} (${Object.keys(p.joints).length} joints)`,
                        value: p.id,
                      }))
                      : [
                        { label: 'Home Calibration (Preset)', value: 'preset-home' },
                        { label: 'Wave Ready (Preset)', value: 'preset-wave' },
                        { label: 'Parked Rest (Preset)', value: 'preset-rest' },
                      ]
                  }
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  Poses apply target positions across all joints defined in the pose simultaneously.
                </div>
              </div>
            ) : (
              /* If Target or Delta mode */
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    SELECT JOINT
                  </label>
                  <Select
                    value={moveData.jointName || joints[0]?.name}
                    onChange={(val) => onUpdateNodeData(selectedNode.id, { jointName: val })}
                    options={groupedJointOptions}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  />
                  {activeJoint && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--color-text-muted)' }}>
                      <span>Category: {activeJoint.category || 'Default'}</span>
                      <span>Range: [{activeJoint.minValue}°, {activeJoint.maxValue}°]</span>
                    </div>
                  )}
                </div>

                {/* Target Angle Mode */}
                {moveData.mode === 'target' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        TARGET POSITION (DEGREES)
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-highlight)' }}>
                        {moveData.targetValue}°
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Slider
                        min={activeJoint?.minValue ?? -180}
                        max={activeJoint?.maxValue ?? 180}
                        step={1}
                        value={moveData.targetValue}
                        onChange={(val) => onUpdateNodeData(selectedNode.id, { targetValue: val })}
                        style={{ flex: 1 }}
                      />
                      <InputNumber
                        min={activeJoint?.minValue ?? -180}
                        max={activeJoint?.maxValue ?? 180}
                        value={moveData.targetValue}
                        onChange={(val) => val !== null && onUpdateNodeData(selectedNode.id, { targetValue: val })}
                        size="small"
                        style={{ width: 75 }}
                      />
                    </div>
                  </div>
                )}

                {/* Relative Delta Mode */}
                {moveData.mode === 'delta' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        RELATIVE DELTA (DEGREES)
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFAA00' }}>
                        {moveData.deltaValue > 0 ? `+${moveData.deltaValue}` : moveData.deltaValue}°
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Slider
                        min={-90}
                        max={90}
                        step={1}
                        value={moveData.deltaValue}
                        onChange={(val) => onUpdateNodeData(selectedNode.id, { deltaValue: val })}
                        style={{ flex: 1 }}
                      />
                      <InputNumber
                        min={-180}
                        max={180}
                        value={moveData.deltaValue}
                        onChange={(val) => val !== null && onUpdateNodeData(selectedNode.id, { deltaValue: val })}
                        size="small"
                        style={{ width: 75 }}
                      />
                    </div>

                    {/* Quick Step Buttons */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {[-30, -15, -5, 5, 15, 30].map((step) => (
                        <Button
                          key={step}
                          size="small"
                          onClick={() => onUpdateNodeData(selectedNode.id, { deltaValue: step })}
                          style={{
                            fontSize: 10,
                            height: 22,
                            padding: '0 6px',
                            backgroundColor: moveData.deltaValue === step ? 'rgba(0, 255, 65, 0.2)' : 'transparent',
                            borderColor: moveData.deltaValue === step ? 'var(--color-highlight)' : 'var(--color-secondary)',
                            color: moveData.deltaValue === step ? 'var(--color-highlight)' : 'var(--color-text-secondary)',
                          }}
                        >
                          {step > 0 ? `+${step}` : step}°
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── RESET NODE CONFIG ─── */}
        {isReset && resetData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                RESET SCOPE
              </label>
              <Segmented
                value={resetData.scope}
                options={[
                  { label: 'Entire Robot', value: 'all', icon: <UndoOutlined /> },
                  { label: 'Category', value: 'category', icon: <AppstoreOutlined /> },
                  { label: 'Joint', value: 'joint', icon: <SettingOutlined /> },
                ]}
                onChange={(val) => onUpdateNodeData(selectedNode.id, { scope: val as ResetScope })}
                block
                style={{ backgroundColor: 'rgba(25, 25, 25, 0.6)' }}
              />
            </div>

            {/* Scope = Category */}
            {resetData.scope === 'category' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  SELECT JOINT CATEGORY
                </label>
                <Select
                  value={resetData.category || uniqueCategories[0]}
                  onChange={(val) => onUpdateNodeData(selectedNode.id, { category: val })}
                  options={uniqueCategories.map((cat) => ({ label: cat, value: cat }))}
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  All joints in [{resetData.category || uniqueCategories[0]}] will return to their rest angle.
                </div>
              </div>
            )}

            {/* Scope = Single Joint */}
            {resetData.scope === 'joint' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  SELECT INDIVIDUAL JOINT
                </label>
                <Select
                  value={resetData.jointName || joints[0]?.name}
                  onChange={(val) => onUpdateNodeData(selectedNode.id, { jointName: val })}
                  options={groupedJointOptions}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  Joint [{resetData.jointName || joints[0]?.name}] will return to its rest position (0°).
                </div>
              </div>
            )}

            {/* Scope = Everything */}
            {resetData.scope === 'all' && (
              <Alert
                message="Full Reset Warning"
                description="This step will return all actuated robot joints across all categories back to rest values."
                type="info"
                showIcon
                style={{
                  backgroundColor: 'rgba(179, 127, 235, 0.08)',
                  borderColor: 'rgba(179, 127, 235, 0.3)',
                  color: 'var(--color-text-primary)',
                }}
              />
            )}
          </div>
        )}

        <Divider style={{ borderColor: 'var(--color-secondary-subtle, rgba(43, 62, 80, 0.4))', margin: '10px 0' }} />

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => onTestNode(selectedNode)}
            style={{
              backgroundColor: 'var(--color-highlight)',
              borderColor: 'var(--color-highlight)',
              color: 'var(--color-text-on-highlight)',
              fontWeight: 700,
            }}
          >
            Test This Step
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<CopyOutlined />}
              onClick={() => onDuplicateNode(selectedNode.id)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              Duplicate
            </Button>

            <Popconfirm
              title="Delete node?"
              description="Remove this node from the flow?"
              onConfirm={() => onDeleteNode(selectedNode.id)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                style={{
                  backgroundColor: 'transparent',
                }}
              >
                Delete
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>
    </div>
  );
};
