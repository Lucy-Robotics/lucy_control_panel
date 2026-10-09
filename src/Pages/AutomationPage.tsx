/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type OnConnect,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { message } from 'antd';

import { useRosConnection } from '../hooks/useRosConnection.hook';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { storageService, type SavedPose } from '../Services/storage.service';
import type { JointControlState } from '../Constants/robotTypes';
import { DEFAULT_JOINT_SLIDER_BOUNDS_DEG, DEFAULT_JOINT_SLIDER_VALUE_DEG } from '../Constants/hardwareConfigDefaults';
import type { ControllerJointConfig } from '../Constants/rosConfig';

import { nodeTypes } from '../Components/Automation/nodes/nodeTypes';
import { edgeTypes } from '../Components/Automation/edges/edgeTypes';
import { AutomationHeader } from '../Components/Automation/AutomationHeader';
import { AutomationLibrary } from '../Components/Automation/AutomationLibrary';
import { AutomationConfigPanel } from '../Components/Automation/AutomationConfigPanel';
import { AutomationConsole } from '../Components/Automation/AutomationConsole';
import { ManageRoutinesModal } from '../Components/Automation/ManageRoutinesModal';
import { Robot3DViewerModal } from '../Components/Robot3DViewerModal';
import { useAutomationEngine } from '../Components/Automation/hooks/useAutomationEngine';

import { FALLBACK_LUCY_JOINTS } from '../Components/Automation/data/defaultAutomations';

import type {
  AutomationNodeData,
  AutomationNodeType,
  AutomationFlow,
  WaitNodeData,
  MoveNodeData,
  ResetNodeData,
} from '../Components/Automation/types/automation.types';

export const AutomationPage: React.FC = () => {
  const { isConnected } = useRosConnection();
  const { controllerConfigsFromActive } = useActiveHardwareRos();

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<AutomationNodeData>, Edge> | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Flow State: Starts completely empty (no default preset)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AutomationNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState<string>('New Routine');
  const [loop, setLoop] = useState<boolean>(false);

  // Console closed by default
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

  // 3D View Modal
  const [is3DViewOpen, setIs3DViewOpen] = useState<boolean>(false);

  // Routine Save & Load Modal
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState<boolean>(false);
  const [routineModalTab, setRoutineModalTab] = useState<'save' | 'load'>('save');
  const [loadedRoutine, setLoadedRoutine] = useState<AutomationFlow | null>(null);

  // Robot Joints & Saved Poses
  const [joints, setJoints] = useState<JointControlState[]>(FALLBACK_LUCY_JOINTS);
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);

  // Convert active hardware configs into JointControlState[]
  const buildJointsFromControllerConfig = useCallback(
    (configs: ControllerJointConfig[]): JointControlState[] => {
      const result: JointControlState[] = [];
      for (const c of configs) {
        for (const name of c.joints) {
          const lim = c.jointLimits?.[name];
          let minValue = DEFAULT_JOINT_SLIDER_BOUNDS_DEG.min;
          let maxValue = DEFAULT_JOINT_SLIDER_BOUNDS_DEG.max;
          let restValue: number | undefined;
          if (lim) {
            minValue = lim.minDeg;
            maxValue = lim.maxDeg;
            restValue = lim.defaultDeg;
          }
          result.push({
            name,
            displayName: c.jointDisplayNames?.[name] ?? name,
            currentValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_DEG,
            targetValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_DEG,
            minValue,
            maxValue,
            type: 'revolute',
            category: c.defaultCategory,
            valueInActuatorDegrees: true,
            ...(restValue !== undefined && { restValue }),
          });
        }
      }
      return result;
    },
    []
  );

  // Sync joints from active hardware if connected
  useEffect(() => {
    if (isConnected && controllerConfigsFromActive && controllerConfigsFromActive.length > 0) {
      const activeJoints = buildJointsFromControllerConfig(controllerConfigsFromActive);
      setJoints(activeJoints);
    } else {
      setJoints(FALLBACK_LUCY_JOINTS);
    }
  }, [isConnected, controllerConfigsFromActive, buildJointsFromControllerConfig]);

  // Load saved poses from storageService
  useEffect(() => {
    storageService.loadPoses().then((poses) => {
      setSavedPoses(poses);
    });
  }, []);

  // Execution Engine Hook
  const {
    isRunning,
    isPaused,
    currentStepIndex,
    logs,
    clearLogs,
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    testSingleNode,
  } = useAutomationEngine({
    nodes,
    edges,
    setNodes,
    joints,
    setJoints,
    isConnected,
    loop,
  });

  // Track currently selected node
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // Connect nodes with deletable edges
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'deletable',
        animated: true,
        style: { stroke: 'var(--color-highlight)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-highlight)',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Update node data from Config Panel
  const handleUpdateNodeData = useCallback(
    (nodeId: string, partialData: Partial<AutomationNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...partialData,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      message.info('Node deleted');
    },
    [selectedNodeId, setNodes, setEdges]
  );

  // Duplicate node
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;

      const newId = `node-${Date.now()}`;
      const duplicatedNode: Node<AutomationNodeData> = {
        ...target,
        id: newId,
        position: {
          x: target.position.x + 40,
          y: target.position.y + 40,
        },
        data: {
          ...target.data,
          label: `${target.data.label} (Copy)`,
          status: 'idle',
        },
        selected: true,
      };

      setNodes((nds) => [...nds, duplicatedNode]);
      setSelectedNodeId(newId);
      message.success('Node duplicated');
    },
    [nodes, setNodes]
  );

  // Add node at reasonable position
  const handleAddNode = useCallback(
    (type: AutomationNodeType, position?: { x: number; y: number }) => {
      const newId = `node-${Date.now()}`;
      let defaultData: AutomationNodeData;

      if (type === 'waitNode') {
        defaultData = {
          label: 'Wait',
          duration: 1.0,
          unit: 's',
          status: 'idle',
        } as WaitNodeData;
      } else if (type === 'moveNode') {
        const defaultJoint = joints[0]?.name || 'neck_yaw';
        defaultData = {
          label: 'Move',
          mode: 'target',
          jointName: defaultJoint,
          targetValue: 0,
          deltaValue: 10,
          status: 'idle',
        } as MoveNodeData;
      } else {
        defaultData = {
          label: 'Reset',
          scope: 'all',
          status: 'idle',
        } as ResetNodeData;
      }

      // Default position logic if not dropped
      const targetPos = position || {
        x: nodes.length > 0 ? Math.max(...nodes.map((n) => n.position.x)) + 300 : 120,
        y: 140,
      };

      const newNode: Node<AutomationNodeData> = {
        id: newId,
        type,
        position: targetPos,
        data: defaultData,
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);
    },
    [joints, nodes, setNodes]
  );

  // Drag and Drop from Left Library to React Flow Canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow') as AutomationNodeType;
      if (!nodeType || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      handleAddNode(nodeType, position);
    },
    [rfInstance, handleAddNode]
  );

  // Clear Canvas
  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setLoadedRoutine(null);
    setFlowName('New Routine');
    message.info('Canvas cleared');
  }, [setNodes, setEdges]);

  // Load Saved Routine
  const handleLoadRoutine = useCallback(
    (flow: AutomationFlow) => {
      // Ensure all edges have deletable type
      const styledEdges = (flow.edges || []).map((e) => ({
        ...e,
        type: 'deletable',
      }));
      setNodes(flow.nodes || []);
      setEdges(styledEdges);
      setFlowName(flow.name);
      setLoop(flow.loop || false);
      setSelectedNodeId(null);
      setLoadedRoutine(flow);
    },
    [setNodes, setEdges]
  );

  // Auto Layout nodes sequentially
  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => {
      return nds.map((node, index) => ({
        ...node,
        position: {
          x: 80 + index * 300,
          y: 140,
        },
      }));
    });
    // Auto-chain edges if there are multiple nodes
    setEdges(() => {
      const chained: Edge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        chained.push({
          id: `chain-${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
          type: 'deletable',
          style: { stroke: 'var(--color-secondary-hover)', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'var(--color-secondary-hover)',
          },
        });
      }
      return chained;
    });
    message.success('Arranged in sequence');
  }, [nodes, setNodes, setEdges]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        flex: 1,
        minHeight: 0,
        backgroundColor: 'var(--color-main)',
        overflow: 'hidden',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-content)',
      }}
      className="automation-page-container"
    >
      {/* Top Header / Control Toolbar */}
      <AutomationHeader
        flowName={flowName}
        onFlowNameChange={setFlowName}
        isRunning={isRunning}
        isPaused={isPaused}
        loop={loop}
        onLoopChange={setLoop}
        onStart={startExecution}
        onPause={pauseExecution}
        onResume={resumeExecution}
        onStop={stopExecution}
        onOpenSaveModal={() => {
          setRoutineModalTab('save');
          setIsRoutineModalOpen(true);
        }}
        onOpenLoadModal={() => {
          setRoutineModalTab('load');
          setIsRoutineModalOpen(true);
        }}
        onToggle3DView={() => setIs3DViewOpen((v) => !v)}
        is3DViewOpen={is3DViewOpen}
        currentStepIndex={currentStepIndex}
        totalSteps={nodes.length}
        isConnected={isConnected}
        onToggleConsole={() => setIsConsoleOpen((prev) => !prev)}
        isConsoleOpen={isConsoleOpen}
      />

      {/* Main 3-Column Workspace */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Column: Node Library (Palette) */}
        <div style={{ width: 270, minWidth: 240, maxWidth: 300, flexShrink: 0, zIndex: 5 }}>
          <AutomationLibrary
            onAddNode={handleAddNode}
            onClearCanvas={handleClearCanvas}
            onAutoLayout={handleAutoLayout}
            disabled={isRunning}
          />
        </div>

        {/* Center Column: React Flow Board */}
        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, height: '100%', position: 'relative', backgroundColor: '#0e0e0e' }}
        >
          <ReactFlowProvider>
            <ReactFlow<Node<AutomationNodeData>, Edge>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setRfInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'deletable' }}
              deleteKeyCode={['Backspace', 'Delete']}
              onEdgesDelete={() => message.info('Connection removed')}
              fitView
              proOptions={{ hideAttribution: true }}
              style={{ backgroundColor: '#101010' }}
            >
              <Background
                color="var(--color-secondary, #2B3E50)"
                gap={24}
                size={1.2}
              />
              <Controls
                style={{
                  backgroundColor: 'var(--color-main)',
                  borderColor: 'var(--color-secondary)',
                  borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                }}
              />
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === 'waitNode') return '#FFAA00';
                  if (n.type === 'moveNode') return '#00FF41';
                  if (n.type === 'resetNode') return '#B37FEB';
                  return '#2B3E50';
                }}
                maskColor="rgba(20, 20, 20, 0.75)"
                style={{
                  backgroundColor: 'rgba(15, 15, 15, 0.95)',
                  borderColor: 'var(--color-secondary)',
                  borderRadius: 6,
                }}
              />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Column: Selected Node Configuration Inspector */}
        <div style={{ width: 360, minWidth: 320, maxWidth: 420, flexShrink: 0, zIndex: 5 }}>
          <AutomationConfigPanel
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onTestNode={testSingleNode}
            onClose={() => setSelectedNodeId(null)}
            joints={joints}
            savedPoses={savedPoses}
            allNodes={nodes}
            onSelectNode={setSelectedNodeId}
          />
        </div>
      </div>

      {/* Bottom Dock / Execution Console */}
      <AutomationConsole
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        logs={logs}
        onClearLogs={clearLogs}
      />

      {/* Routine Save / Load Modal */}
      <ManageRoutinesModal
        isVisible={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        activeTab={routineModalTab}
        currentNodes={nodes}
        currentEdges={edges}
        currentLoop={loop}
        currentFlowName={flowName}
        loadedRoutine={loadedRoutine}
        onLoadRoutine={handleLoadRoutine}
        onRoutineSaved={(savedFlow) => {
          setLoadedRoutine(savedFlow);
          setFlowName(savedFlow.name);
        }}
      />

      {/* Floating 3D Robot Viewer Modal */}
      <Robot3DViewerModal
        isVisible={is3DViewOpen}
        onClose={() => setIs3DViewOpen(false)}
        initialPosition={{ x: 120, y: 120 }}
        initialSize={{ w: 420, h: 560 }}
      />
    </div>
  );
};

export default AutomationPage;
