/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { Typography } from 'antd';
import { RobotFKModel } from '../Components/RobotFKModel';
import { JointRotationGizmo } from '../Components/JointRotationGizmo';
import { getLinkBoundingBox, isURDFVisual, findJointForLink } from '../Utils/robotModel.utils';
import { StreamSwitch } from '../Components/StreamSwitch';
import { useRobotModel } from '../hooks/useRobotModel';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { useThrottledJointAngles } from '../hooks/useThrottledJointAngles';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';
import type { JointControlState } from '../Constants/robotTypes';
import {
    UI_ACCENT_GREEN_HEX,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
    TEXT_PRIMARY,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

const SETTINGS_BOX_WIDTH = 150;
const MOUSE_HINTS = [
    'L-drag · rotate',
    'scroll · zoom',
    'R-drag · pan',
    'dbl-click part · focus & follow',
    'dbl-click space · unfocus',
    'gizmo drag · rotate joint',
];

type Vec3 = [number, number, number];

const savedCamera: { position: Vec3; target: Vec3 } = {
    position: [0, 2, 3],
    target: [0, 1, 0],
};

const CENTERED_FILL: React.CSSProperties = {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, background: 'var(--color-main)',
};

/** Shared chrome for the floating overlay panels (each adds its own position). */
const OVERLAY_BOX: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: 10,
    color: UI_TEXT_PRIMARY_ON_DARK,
    display: 'flex',
    flexDirection: 'column',
};

const SWITCH_ROW: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
};

const SwitchRow: React.FC<{
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
    <div style={SWITCH_ROW}>
        <span style={{ color: UI_TEXT_SECONDARY_MUTED }}>{label}</span>
        <StreamSwitch value={value} onChange={onChange} />
    </div>
);

const LoadingBar: React.FC<{ progress: number }> = ({ progress }) => {
    const indeterminate = progress <= 0;
    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'var(--color-secondary)', overflow: 'hidden', zIndex: 3,
        }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    background: 'var(--color-highlight)',
                    ...(indeterminate
                        ? { width: '40%', animation: 'urdfLoadSlide 1.1s ease-in-out infinite' }
                        : { left: 0, width: `${Math.round(progress * 100)}%`, transition: 'width 0.2s ease' }),
                }}
            />
            <style>{'@keyframes urdfLoadSlide { 0% { left: -40%; } 100% { left: 100%; } }'}</style>
        </div>
    );
};

interface CameraFollowControllerProps {
    robot: URDFRobot | null;
    selectedPartName: string | null;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const CameraFollowController: React.FC<CameraFollowControllerProps> = ({
    robot,
    selectedPartName,
    controlsRef,
}) => {
    const { camera } = useThree();
    const prevSelectedRef = useRef<string | null>(null);
    const localCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const lastWorldCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const isTransitioningRef = useRef<boolean>(false);
    const transitionProgressRef = useRef<number>(0);
    const startCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const startTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const desiredOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());

    useEffect(() => {
        if (!robot || !selectedPartName) {
            prevSelectedRef.current = null;
            isTransitioningRef.current = false;
            return;
        }

        const link = robot.links[selectedPartName];
        if (!link) return;

        prevSelectedRef.current = selectedPartName;

        robot.updateMatrixWorld(true);
        link.updateWorldMatrix(true, false);

        const box = getLinkBoundingBox(link);
        const worldCenter = box.getCenter(new THREE.Vector3());
        localCenterRef.current = link.worldToLocal(worldCenter.clone());
        lastWorldCenterRef.current.copy(worldCenter);

        const controls = controlsRef.current;
        if (controls) {
            startTargetRef.current.copy(controls.target);
            startCamPosRef.current.copy(camera.position);

            const size = box.getSize(new THREE.Vector3());
            const radius = Math.max(size.x, size.y, size.z, 0.05) / 2;
            const framingDist = THREE.MathUtils.clamp(radius * 3.5, 0.35, 3.0);

            const rawDir = camera.position.clone().sub(controls.target);
            const dir = rawDir.lengthSq() < 0.0001
                ? new THREE.Vector3(0, 0.5, 1).normalize()
                : rawDir.normalize();

            desiredOffsetRef.current.copy(dir.multiplyScalar(framingDist));
            isTransitioningRef.current = true;
            transitionProgressRef.current = 0;
        }
    }, [robot, selectedPartName, camera, controlsRef]);

    useFrame((_state, delta) => {
        const controls = controlsRef.current;
        if (!controls || !selectedPartName || !robot) return;

        const link = robot.links[selectedPartName];
        if (!link) return;

        link.updateWorldMatrix(true, false);
        const currentWorldCenter = link.localToWorld(localCenterRef.current.clone());

        if (isTransitioningRef.current) {
            const DURATION = 0.45;
            transitionProgressRef.current += delta / DURATION;
            const rawT = Math.min(1, transitionProgressRef.current);
            const ease = 1 - Math.pow(1 - rawT, 3);

            const targetCamPos = currentWorldCenter.clone().add(desiredOffsetRef.current);
            controls.target.lerpVectors(startTargetRef.current, currentWorldCenter, ease);
            camera.position.lerpVectors(startCamPosRef.current, targetCamPos, ease);
            controls.update();

            if (rawT >= 1) {
                isTransitioningRef.current = false;
                lastWorldCenterRef.current.copy(currentWorldCenter);
            }
        } else {
            const displacement = currentWorldCenter.clone().sub(lastWorldCenterRef.current);
            if (displacement.lengthSq() > 0.000001) {
                controls.target.copy(currentWorldCenter);
                camera.position.add(displacement);
                controls.update();
            }
            lastWorldCenterRef.current.copy(currentWorldCenter);
        }
    });

    return null;
};

export interface Robot3DViewerProps {
    isControlOn?: boolean;
    joints?: JointControlState[];
    onJointValueChange?: (name: string, value: number) => void;
}

const Robot3DViewer: React.FC<Robot3DViewerProps> = ({
    isControlOn: isControlOnProp,
    joints,
    onJointValueChange,
}) => {
    const { robot, loading, progress, error, reload } = useRobotModel();
    const { isConnected } = useRosConnection();
    const [isGizmoDragging, setIsGizmoDragging] = useState(false);
    const jointAngles = useThrottledJointAngles(isConnected && !isGizmoDragging);

    const [hasRosControl, setHasRosControl] = useState<boolean>(() => {
        const handler = ControlModeHandler.getInstance();
        return handler.currentControllerId !== '' && handler.currentControllerId === handler.clientId;
    });

    useEffect(() => {
        const handler = ControlModeHandler.getInstance();
        return handler.onControllerChanged((activeClientId) => {
            setHasRosControl(activeClientId !== '' && activeClientId === handler.clientId);
        });
    }, []);

    const effectiveControlOn = isControlOnProp !== undefined ? isControlOnProp : hasRosControl;

    // Default to DAE — matches the urdf-loader initial state before any material override
    const [useOriginalTexture, setUseOriginalTexture] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [opacity, setOpacity] = useState(0.85);
    const [wireframe, setWireframe] = useState(false);
    const [selectedPartName, setSelectedPartName] = useState<string | null>(null);
    const [unselectedOpacity, setUnselectedOpacity] = useState(0.25);

    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const lastPartClickTimeRef = useRef<number>(0);
    const heldJointsRef = useRef<Map<string, { targetRad: number; timestamp: number }>>(new Map());

    const handleJointCommit = useCallback((name: string, targetRad: number) => {
        heldJointsRef.current.set(name, { targetRad, timestamp: Date.now() });
    }, []);

    const initialCamera = useRef({
        position: [...savedCamera.position] as Vec3,
        target: [...savedCamera.target] as Vec3,
    }).current;

    const availableParts = useMemo(() => {
        if (!robot) return [];
        return Object.keys(robot.links).filter(linkName => {
            const link = robot.links[linkName];
            return link && link.children.some(isURDFVisual);
        });
    }, [robot]);

    const focusedJoint = useMemo(() => {
        if (!robot || !selectedPartName) return null;
        const link = robot.links[selectedPartName];
        if (!link) return null;
        return findJointForLink(link, robot);
    }, [robot, selectedPartName]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedPartName(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleControlsChange = () => {
        const controls = controlsRef.current;
        if (!controls) { return; }
        savedCamera.position = controls.object.position.toArray() as Vec3;
        savedCamera.target = controls.target.toArray() as Vec3;
    };

    const handlePartDoubleClick = (partName: string) => {
        lastPartClickTimeRef.current = Date.now();
        setSelectedPartName(prev => (prev === partName ? null : partName));
    };

    const handleCanvasDoubleClick = () => {
        // If the double click was on a part, ignore canvas background double-click
        if (Date.now() - lastPartClickTimeRef.current < 150) return;
        setSelectedPartName(null);
    };

    const handleResetCamera = () => {
        setSelectedPartName(null);
        const controls = controlsRef.current;
        if (!controls) return;
        controls.target.set(0, 1, 0);
        controls.object.position.set(0, 2, 3);
        controls.update();
    };

    if (error) {
        return (
            <div style={{ ...CENTERED_FILL, padding: 12 }}>
                {error.split('\n').map((line, i) => (
                    <Text key={i} style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: 11, textAlign: 'center' }}>
                        {line}
                    </Text>
                ))}
                <button onClick={reload} style={{ fontFamily: 'monospace', cursor: 'pointer' }}>Retry</button>
            </div>
        );
    }

    return (
        <div
            style={{ width: '100%', height: '100%', position: 'relative', border: '1px solid var(--color-secondary)' }}
            onDoubleClick={handleCanvasDoubleClick}
        >
            {loading && <LoadingBar progress={progress} />}
            <Canvas
                camera={{ position: initialCamera.position, fov: 50, near: 0.1, far: 500 }}
                style={{ width: '100%', height: '100%', background: 'var(--color-main)', flex: 1 }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color={UI_ACCENT_GREEN_HEX} />

                {showGrid && (
                    <Grid
                        args={[30, 30]}
                        cellSize={1}
                        cellThickness={1}
                        cellColor={UI_ACCENT_GREEN_HEX}
                        sectionSize={2}
                        sectionThickness={1}
                        sectionColor={TEXT_PRIMARY}
                        fadeDistance={20}
                        fadeStrength={1}
                    />
                )}

                {robot && (
                    <RobotFKModel
                        robot={robot}
                        jointAngles={jointAngles}
                        opacity={opacity}
                        wireframe={wireframe}
                        useOriginalTexture={useOriginalTexture}
                        selectedPartName={selectedPartName}
                        unselectedOpacity={unselectedOpacity}
                        onPartDoubleClick={handlePartDoubleClick}
                        isSyncPaused={isGizmoDragging}
                        activeGizmoJointName={isGizmoDragging ? (focusedJoint?.urdfName || focusedJoint?.name) : null}
                        heldJointsRef={heldJointsRef}
                    />
                )}

                <JointRotationGizmo
                    joint={focusedJoint}
                    isControlOn={effectiveControlOn}
                    joints={joints}
                    onJointValueChange={onJointValueChange}
                    onJointCommit={handleJointCommit}
                    onDraggingChange={setIsGizmoDragging}
                    controlsRef={controlsRef}
                />

                <CameraFollowController
                    robot={robot}
                    selectedPartName={selectedPartName}
                    controlsRef={controlsRef}
                />

                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    target={initialCamera.target}
                    onChange={handleControlsChange}
                    enablePan
                    enableZoom
                    enableRotate
                    dampingFactor={0.1}
                    minDistance={0.2}
                    maxDistance={10}
                />
            </Canvas>

            {/* Controls hint — top-left */}
            <div className="chamfer-box viewer-overlay-box" style={{ ...OVERLAY_BOX, top: 10, gap: 4, pointerEvents: 'none', userSelect: 'none' }}>
                <span style={{ color: 'var(--color-highlight)', fontWeight: 'bold', letterSpacing: 1 }}>CONTROLS:</span>
                <div style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 9, lineHeight: 1.6 }}>
                    {MOUSE_HINTS.map(hint => <div key={hint}>• {hint}</div>)}
                </div>
            </div>

            {/* Floating active follow badge — bottom-center */}
            {selectedPartName && (
                <div
                    className="chamfer-box viewer-overlay-box"
                    style={{
                        position: 'absolute',
                        bottom: 56,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        zIndex: 10,
                        background: 'rgba(20, 20, 20, 0.88)',
                        border: '1px solid #00E5FF',
                        boxShadow: '0 0 14px rgba(0, 229, 255, 0.3)',
                    }}
                >
                    <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>FOLLOWING:</span>
                    <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>{selectedPartName}</span>
                    {focusedJoint && (
                        <>
                            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, marginLeft: 6 }}>JOINT:</span>
                            <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{focusedJoint.urdfName || focusedJoint.name}</span>
                        </>
                    )}
                    <button
                        onClick={() => setSelectedPartName(null)}
                        style={{
                            marginLeft: 4,
                            padding: '2px 8px',
                            background: 'rgba(0, 229, 255, 0.12)',
                            border: '1px solid rgba(0, 229, 255, 0.5)',
                            color: '#00E5FF',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                        }}
                        title="Unfollow part and release camera (Esc)"
                    >
                        UNFOCUS
                    </button>
                </div>
            )}

            {/* Settings */}
            <div className="chamfer-box viewer-overlay-box" style={{ ...OVERLAY_BOX, top: 10, left: 'auto', right: 10, width: SETTINGS_BOX_WIDTH, gap: 6 }}>
                {/* Part selector & transparency of unselected parts */}
                {availableParts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 9 }}>PART FOCUS</span>
                            <select
                                value={selectedPartName || ''}
                                onChange={e => setSelectedPartName(e.target.value || null)}
                                style={{
                                    width: '100%',
                                    background: 'var(--color-main)',
                                    border: '1px solid var(--color-secondary)',
                                    color: selectedPartName ? '#00E5FF' : UI_TEXT_PRIMARY_ON_DARK,
                                    fontFamily: 'monospace',
                                    fontSize: 9,
                                    padding: '2px 4px',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="">(None - Free view)</option>
                                {availableParts.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Transparency of unselected parts slider */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: selectedPartName ? 'var(--color-highlight)' : UI_TEXT_SECONDARY_MUTED, fontSize: 9 }}>
                                    OTHER OPACITY
                                </span>
                                <span style={{ color: selectedPartName ? 'var(--color-highlight)' : UI_TEXT_SECONDARY_MUTED, fontSize: 9 }}>
                                    {Math.round(unselectedOpacity * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={unselectedOpacity}
                                onChange={e => setUnselectedOpacity(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                                title="Transparency of not selected parts"
                            />
                        </div>
                    </div>
                )}

                {/* Opacity & wireframe only affect the green override */}
                {!useOriginalTexture && (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: 'var(--color-highlight)' }}>OPACITY {Math.round(opacity * 100)}%</span>
                            <input
                                type="range" min="0.1" max="1" step="0.1" value={opacity}
                                onChange={e => setOpacity(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>
                        <SwitchRow label="WIRE" value={wireframe} onChange={setWireframe} />
                    </>
                )}
                <SwitchRow label="TEXTURE" value={useOriginalTexture} onChange={setUseOriginalTexture} />
                <SwitchRow label="GRID" value={showGrid} onChange={setShowGrid} />

                <button
                    onClick={handleResetCamera}
                    style={{
                        width: '100%',
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid var(--color-secondary)',
                        color: UI_TEXT_SECONDARY_MUTED,
                        cursor: 'pointer',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        borderRadius: 2,
                        marginTop: 2,
                        textAlign: 'center',
                    }}
                    title="Reset camera to default position"
                >
                    RESET CAMERA
                </button>
            </div>
        </div>
    );
};

export default Robot3DViewer;
