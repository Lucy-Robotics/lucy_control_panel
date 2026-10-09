/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { JointControlState } from '../../../Constants/robotTypes';
import { JointStateHandler } from '../../../Services/ros/handlers/JointState.handler';
import { storageService } from '../../../Services/storage.service';
import type {
  AutomationNodeData,
  WaitNodeData,
  MoveNodeData,
  ResetNodeData,
  ExecutionLogEntry,
} from '../types/automation.types';

interface UseAutomationEngineProps {
  nodes: Node<AutomationNodeData>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AutomationNodeData>[]>>;
  joints: JointControlState[];
  setJoints: React.Dispatch<React.SetStateAction<JointControlState[]>>;
  isConnected: boolean;
  loop: boolean;
}

export function useAutomationEngine({
  nodes,
  edges,
  setNodes,
  joints,
  setJoints,
  isConnected,
  loop,
}: UseAutomationEngineProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);

  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const jointsRef = useRef(joints);
  jointsRef.current = joints;

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const addLog = useCallback((level: ExecutionLogEntry['level'], message: string, nodeId?: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs((prev) => [
      ...prev.slice(-99), // keep last 100 logs
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: timeStr,
        level,
        message,
        nodeId,
      },
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const computeExecutionChain = useCallback((): Node<AutomationNodeData>[] => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    if (currentNodes.length === 0) return [];

    const incomingEdgeCount = new Map<string, number>();
    const outgoingMap = new Map<string, string[]>();

    for (const node of currentNodes) {
      incomingEdgeCount.set(node.id, 0);
      outgoingMap.set(node.id, []);
    }

    for (const edge of currentEdges) {
      if (incomingEdgeCount.has(edge.target)) {
        incomingEdgeCount.set(edge.target, (incomingEdgeCount.get(edge.target) || 0) + 1);
      }
      if (outgoingMap.has(edge.source)) {
        outgoingMap.get(edge.source)!.push(edge.target);
      }
    }

    const startNodes = currentNodes
      .filter((n) => (incomingEdgeCount.get(n.id) || 0) === 0)
      .sort((a, b) => a.position.x - b.position.x);

    const orderedChain: Node<AutomationNodeData>[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const nodeObj = currentNodes.find((n) => n.id === nodeId);
      if (nodeObj) {
        orderedChain.push(nodeObj);
        const nextIds = outgoingMap.get(nodeId) || [];
        for (const nextId of nextIds) {
          traverse(nextId);
        }
      }
    };

    if (startNodes.length > 0) {
      for (const start of startNodes) {
        traverse(start.id);
      }
    }

    for (const n of currentNodes) {
      if (!visited.has(n.id)) {
        orderedChain.push(n);
        visited.add(n.id);
      }
    }

    return orderedChain;
  }, []);

  const updateNodeStatus = useCallback((nodeId: string, status: AutomationNodeData['status']) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              status,
            },
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const resetAllNodeStatuses = useCallback(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: 'idle',
        },
      }))
    );
  }, [setNodes]);

  const executeNodeAction = useCallback(async (node: Node<AutomationNodeData>): Promise<boolean> => {
    const nodeData = node.data;

    if (cancelRef.current) return false;

    if (node.type === 'waitNode') {
      const waitData = nodeData as WaitNodeData;
      const durationSeconds = waitData.unit === 'ms' ? waitData.duration / 1000 : waitData.duration;
      addLog('info', `Wait: Pausing for ${durationSeconds}s...`, node.id);

      const ms = Math.max(50, durationSeconds * 1000);
      const startWait = Date.now();
      while (Date.now() - startWait < ms) {
        if (cancelRef.current) return false;
        await new Promise((r) => setTimeout(r, 50));
      }
      return true;
    }

    if (node.type === 'moveNode') {
      const moveData = nodeData as MoveNodeData;
      let nextJoints = [...jointsRef.current];

      if (moveData.mode === 'pose' && moveData.poseId) {
        addLog('info', `Move: Applying pose "${moveData.poseName || moveData.poseId}"...`, node.id);
        const poses = await storageService.loadPoses();
        const found = poses.find((p) => p.id === moveData.poseId);
        if (found) {
          nextJoints = nextJoints.map((j) => {
            const val = found.joints[j.name];
            return val !== undefined ? { ...j, currentValue: val, targetValue: val } : j;
          });
        } else {
          addLog('warning', `Pose ${moveData.poseId} not found, continuing...`, node.id);
        }
      } else if (moveData.mode === 'delta') {
        const delta = moveData.deltaValue || 0;
        addLog('info', `Move: Nudging joint "${moveData.jointName}" by ${delta > 0 ? `+${delta}` : delta}°...`, node.id);
        nextJoints = nextJoints.map((j) => {
          if (j.name === moveData.jointName) {
            const raw = j.currentValue + delta;
            const clamped = Math.max(j.minValue, Math.min(j.maxValue, raw));
            return { ...j, currentValue: clamped, targetValue: clamped };
          }
          return j;
        });
      } else {
        const target = moveData.targetValue ?? 0;
        addLog('info', `Move: Positioning joint "${moveData.jointName}" to ${target}°...`, node.id);
        nextJoints = nextJoints.map((j) => {
          if (j.name === moveData.jointName) {
            const clamped = Math.max(j.minValue, Math.min(j.maxValue, target));
            return { ...j, currentValue: clamped, targetValue: clamped };
          }
          return j;
        });
      }

      setJoints(nextJoints);
      jointsRef.current = nextJoints;

      if (isConnected) {
        JointStateHandler.getInstance().publishJointStates(nextJoints);
      }

      // Transition duration is handled by the robot / simulator
      const startMove = Date.now();
      while (Date.now() - startMove < 300) {
        if (cancelRef.current) return false;
        await new Promise((r) => setTimeout(r, 50));
      }
      return true;
    }

    if (node.type === 'resetNode') {
      const resetData = nodeData as ResetNodeData;
      let nextJoints = [...jointsRef.current];

      if (resetData.scope === 'all') {
        addLog('info', 'Reset: Resetting ALL joints to rest position...', node.id);
        nextJoints = nextJoints.map((j) => {
          const rest = j.restValue ?? 0;
          return { ...j, currentValue: rest, targetValue: rest };
        });
      } else if (resetData.scope === 'category') {
        const cat = resetData.category || '';
        addLog('info', `Reset: Resetting joints in category [${cat}] to rest...`, node.id);
        nextJoints = nextJoints.map((j) => {
          if (j.category === cat) {
            const rest = j.restValue ?? 0;
            return { ...j, currentValue: rest, targetValue: rest };
          }
          return j;
        });
      } else if (resetData.scope === 'joint') {
        const jointName = resetData.jointName || '';
        addLog('info', `Reset: Resetting joint [${jointName}] to rest position...`, node.id);
        nextJoints = nextJoints.map((j) => {
          if (j.name === jointName) {
            const rest = j.restValue ?? 0;
            return { ...j, currentValue: rest, targetValue: rest };
          }
          return j;
        });
      }

      setJoints(nextJoints);
      jointsRef.current = nextJoints;

      if (isConnected) {
        JointStateHandler.getInstance().publishJointStates(nextJoints);
      }

      await new Promise((r) => setTimeout(r, 400));
      return true;
    }

    return true;
  }, [addLog, isConnected, setJoints]);

  const startExecution = useCallback(async () => {
    const chain = computeExecutionChain();
    if (chain.length === 0) {
      addLog('warning', 'No nodes in the flow to execute.');
      return;
    }

    cancelRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    resetAllNodeStatuses();

    addLog('info', `▶ Started automation run: ${chain.length} step(s) in sequence.`);

    let shouldContinue = true;
    let iteration = 0;

    while (shouldContinue && !cancelRef.current) {
      iteration++;
      if (iteration > 1) {
        addLog('info', `↻ Looping automation (iteration ${iteration})...`);
        resetAllNodeStatuses();
        await new Promise((r) => setTimeout(r, 200));
      }

      for (let i = 0; i < chain.length; i++) {
        if (cancelRef.current) break;

        while (pauseRef.current && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }

        if (cancelRef.current) break;

        const currentNode = chain[i];
        setCurrentStepIndex(i);
        setActiveNodeId(currentNode.id);
        updateNodeStatus(currentNode.id, 'running');

        const success = await executeNodeAction(currentNode);

        if (!success || cancelRef.current) {
          updateNodeStatus(currentNode.id, 'idle');
          break;
        }

        updateNodeStatus(currentNode.id, 'completed');
        addLog('success', `✓ Completed step ${i + 1}/${chain.length}: ${currentNode.data.label}`, currentNode.id);
      }

      if (cancelRef.current || !loop) {
        shouldContinue = false;
      }
    }

    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(-1);
    setActiveNodeId(null);

    if (cancelRef.current) {
      addLog('warning', '⏹ Automation execution stopped by user.');
      resetAllNodeStatuses();
    } else {
      addLog('success', '★ Automation sequence completed successfully!');
    }
  }, [computeExecutionChain, resetAllNodeStatuses, addLog, updateNodeStatus, executeNodeAction, loop]);

  const stopExecution = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(-1);
    setActiveNodeId(null);
    resetAllNodeStatuses();
    addLog('warning', '⏹ Execution halted.');
  }, [resetAllNodeStatuses, addLog]);

  const pauseExecution = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
    addLog('info', '⏸ Execution paused.');
  }, [addLog]);

  const resumeExecution = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
    addLog('info', '▶ Resuming execution...');
  }, [addLog]);

  const testSingleNode = useCallback(async (node: Node<AutomationNodeData>) => {
    if (isRunning) return;
    addLog('info', `Testing individual node: ${node.data.label}...`, node.id);
    updateNodeStatus(node.id, 'running');
    const ok = await executeNodeAction(node);
    updateNodeStatus(node.id, ok ? 'completed' : 'error');
    if (ok) {
      addLog('success', `Node test passed: ${node.data.label}`, node.id);
    }
    setTimeout(() => {
      updateNodeStatus(node.id, 'idle');
    }, 1500);
  }, [isRunning, addLog, updateNodeStatus, executeNodeAction]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return {
    isRunning,
    isPaused,
    currentStepIndex,
    activeNodeId,
    logs,
    clearLogs,
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    testSingleNode,
  };
}
