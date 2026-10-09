/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Button,
  Tabs,
  List,
  Space,
  Segmented,
  Popconfirm,
  Empty,
  message,
} from 'antd';
import {
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  PlusCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { AutomationFlow, AutomationNodeData } from './types/automation.types';
import type { Node, Edge } from '@xyflow/react';

export const STORAGE_KEY_ROUTINES = 'lucy_saved_routines';

interface ManageRoutinesModalProps {
  isVisible: boolean;
  onClose: () => void;
  activeTab: 'save' | 'load';
  currentNodes: Node<AutomationNodeData>[];
  currentEdges: Edge[];
  currentLoop: boolean;
  currentFlowName: string;
  loadedRoutine: AutomationFlow | null;
  onLoadRoutine: (flow: AutomationFlow) => void;
  onRoutineSaved: (savedFlow: AutomationFlow) => void;
}

export const ManageRoutinesModal: React.FC<ManageRoutinesModalProps> = ({
  isVisible,
  onClose,
  activeTab: initialActiveTab,
  currentNodes,
  currentEdges,
  currentLoop,
  currentFlowName,
  loadedRoutine,
  onLoadRoutine,
  onRoutineSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>(initialActiveTab);
  const [saveAction, setSaveAction] = useState<'quicksave' | 'new'>('quicksave');
  const [newRoutineName, setNewRoutineName] = useState('');
  const [routines, setRoutines] = useState<AutomationFlow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  useEffect(() => {
    if (isVisible) {
      loadRoutines();
      if (loadedRoutine) {
        setSaveAction('quicksave');
        setNewRoutineName(`${loadedRoutine.name} (Copy)`);
      } else {
        setSaveAction('new');
        setNewRoutineName(currentFlowName || `Routine #${Date.now().toString().slice(-4)}`);
      }
    }
  }, [isVisible, loadedRoutine, currentFlowName]);

  const loadRoutines = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ROUTINES);
      if (raw) {
        setRoutines(JSON.parse(raw));
      } else {
        setRoutines([]);
      }
    } catch {
      setRoutines([]);
    }
  };

  const handleQuickSave = () => {
    if (!loadedRoutine) return;

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY_ROUTINES);
      const existing: AutomationFlow[] = existingRaw ? JSON.parse(existingRaw) : [];

      const updatedFlow: AutomationFlow = {
        ...loadedRoutine,
        nodes: currentNodes,
        edges: currentEdges,
        loop: currentLoop,
      };

      const updatedList = existing.map((r) => (r.id === loadedRoutine.id ? updatedFlow : r));
      localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(updatedList));
      setRoutines(updatedList);
      onRoutineSaved(updatedFlow);
      message.success(`Quicksaved: Updated routine "${updatedFlow.name}"!`);
      onClose();
    } catch {
      message.error('Failed to update routine in storage.');
    }
  };

  const handleSaveAsNew = () => {
    const trimmed = newRoutineName.trim();
    if (!trimmed) {
      message.error('Please enter a name for the new routine.');
      return;
    }

    const newFlow: AutomationFlow = {
      id: `routine-${Date.now()}`,
      name: trimmed,
      nodes: currentNodes,
      edges: currentEdges,
      loop: currentLoop,
    };

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY_ROUTINES);
      const existing: AutomationFlow[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [newFlow, ...existing.filter((f) => f.name !== trimmed)];
      localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(updated));
      setRoutines(updated);
      onRoutineSaved(newFlow);
      message.success(`Saved new routine "${trimmed}"!`);
      onClose();
    } catch {
      message.error('Failed to save new routine to storage.');
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updated = routines.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(updated));
      setRoutines(updated);
      message.info('Routine deleted.');
    } catch {
      message.error('Failed to delete routine.');
    }
  };

  const handleSelect = (flow: AutomationFlow) => {
    onLoadRoutine(flow);
    message.success(`Loaded routine "${flow.name}"!`);
    onClose();
  };

  const filteredRoutines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routines;
    return routines.filter((r) => r.name.toLowerCase().includes(q));
  }, [routines, searchQuery]);

  return (
    <Modal
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={560}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)' }}>
          <BranchesOutlined style={{ color: 'var(--color-highlight)' }} />
          <span>ROUTINE MANAGER</span>
        </div>
      }
      styles={{
        content: {
          backgroundColor: 'var(--color-main, #141414)',
          border: '1px solid var(--color-secondary)',
          borderRadius: 8,
        },
        header: {
          backgroundColor: 'transparent',
          borderBottom: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.4))',
          paddingBottom: 12,
        },
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'save' | 'load')}
        items={[
          {
            key: 'save',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SaveOutlined />
                Save Routine
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                {/* When an existing routine was loaded, ask whether to replace or create new */}
                {loadedRoutine ? (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                      HOW WOULD YOU LIKE TO SAVE?
                    </label>
                    <Segmented
                      value={saveAction}
                      onChange={(val) => setSaveAction(val as 'quicksave' | 'new')}
                      block
                      options={[
                        {
                          label: (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <SyncOutlined />
                              Replace
                            </span>
                          ),
                          value: 'quicksave',
                        },
                        {
                          label: (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <PlusCircleOutlined />
                              Create as New
                            </span>
                          ),
                          value: 'new',
                        },
                      ]}
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', marginBottom: 14 }}
                    />

                    {saveAction === 'quicksave' ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          backgroundColor: 'rgba(0, 255, 65, 0.06)',
                          border: '1px solid rgba(0, 255, 65, 0.3)',
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-highlight)', marginBottom: 4 }}>
                          Replace existing routine: "{loadedRoutine.name}"
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                          This will overwrite "{loadedRoutine.name}" with the current {currentNodes.length} nodes and connection settings.
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                          NEW ROUTINE NAME
                        </label>
                        <Input
                          value={newRoutineName}
                          onChange={(e) => setNewRoutineName(e.target.value)}
                          placeholder="Enter a new routine name"
                          onPressEnter={handleSaveAsNew}
                          autoFocus
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderColor: 'var(--color-secondary)',
                            color: 'var(--color-text-primary)',
                            fontSize: 14,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* When starting from fresh routine without previously loaded routine */
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                      ROUTINE NAME
                    </label>
                    <Input
                      value={newRoutineName}
                      onChange={(e) => setNewRoutineName(e.target.value)}
                      placeholder="e.g. Wave and Reset, Inspection Routine"
                      onPressEnter={handleSaveAsNew}
                      autoFocus
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderColor: 'var(--color-secondary)',
                        color: 'var(--color-text-primary)',
                        fontSize: 14,
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.4))',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    BOARD SUMMARY:
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-primary)' }}>
                    <span>Nodes: <strong>{currentNodes.length}</strong></span>
                    <span>Connections: <strong>{currentEdges.length}</strong></span>
                    <span>Loop: <strong>{currentLoop ? 'Enabled' : 'Disabled'}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <Button onClick={onClose} style={{ backgroundColor: 'transparent', borderColor: 'var(--color-secondary)' }}>
                    Cancel
                  </Button>

                  {loadedRoutine && saveAction === 'quicksave' ? (
                    <Button
                      type="primary"
                      icon={<SyncOutlined />}
                      onClick={handleQuickSave}
                      disabled={currentNodes.length === 0}
                      style={{
                        backgroundColor: 'var(--color-highlight)',
                        borderColor: 'var(--color-highlight)',
                        color: 'var(--color-text-on-highlight)',
                        fontWeight: 700,
                      }}
                    >
                      Replace Existing
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveAsNew}
                      disabled={currentNodes.length === 0}
                      style={{
                        backgroundColor: 'var(--color-highlight)',
                        borderColor: 'var(--color-highlight)',
                        color: 'var(--color-text-on-highlight)',
                        fontWeight: 700,
                      }}
                    >
                      Save as New Routine
                    </Button>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'load',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FolderOpenOutlined />
                Saved Routines ({routines.length})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                <Input
                  placeholder="Search routines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  size="small"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'var(--color-secondary)',
                    color: 'var(--color-text-primary)',
                  }}
                />

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {filteredRoutines.length === 0 ? (
                    <Empty
                      description="No saved routines found"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '24px 0', color: 'var(--color-text-muted)' }}
                    />
                  ) : (
                    <List
                      dataSource={filteredRoutines}
                      renderItem={(flow) => (
                        <List.Item
                          style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(25, 25, 25, 0.5)',
                            border: '1px solid var(--color-secondary-subtle, rgba(43, 62, 80, 0.3))',
                            borderRadius: 6,
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                              {flow.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', gap: 8 }}>
                              <span>{flow.nodes.length} nodes</span>
                              <span>•</span>
                              <span>{flow.loop ? 'Loops' : 'Run once'}</span>
                            </div>
                          </div>

                          <Space size={6}>
                            <Button
                              size="small"
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              onClick={() => handleSelect(flow)}
                              style={{
                                backgroundColor: 'var(--color-highlight)',
                                borderColor: 'var(--color-highlight)',
                                color: 'var(--color-text-on-highlight)',
                                fontWeight: 600,
                              }}
                            >
                              Load
                            </Button>

                            <Popconfirm
                              title="Delete routine?"
                              description="Are you sure you want to delete this routine?"
                              onConfirm={() => handleDelete(flow.id)}
                              okText="Delete"
                              cancelText="Cancel"
                            >
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                style={{ backgroundColor: 'transparent' }}
                              />
                            </Popconfirm>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};
