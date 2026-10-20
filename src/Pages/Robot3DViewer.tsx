/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { Typography } from 'antd';
import { RobotFKModel } from '../Components/RobotFKModel';
import { JointRotationGizmo } from '../Components/JointRotationGizmo';
import { JointGhost, type GhostTargetMap } from '../Components/JointGhost';
import { useThemeColors3D } from '../hooks/useThemeColors3D';
import { JointPreviewContext } from '../hooks/useJointPreview';
import {
    findJointForLink,
    getActuatedJointNames,
    getLinkBoundingBox,
    isURDFVisual,
    resolveActuatedLinkName,
    urdfNameOf,
} from '../Utils/robotModel.utils';
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

const STORAGE_KEY_UNSELECTED_OPACITY = 'lucy_3d_unselected_opacity';

const getInitialUnselectedOpacity = (): number => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_UNSELECTED_OPACITY);
        if (saved !== null) {
            const parsed = parseFloat(saved);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                return parsed;
            }
        }
    } catch {
        // Fallback to default
    }
    return 0.25;
};

const SETTINGS_BOX_WIDTH = 150;
const FOCUS_COLOR = 'var(--color-status-info)';
const HOVER_CLEAR_DELAY_MS = 300;
const MOUSE_HINTS = [
    'L-drag · rotate',
    'scroll · zoom',
    'R-drag · pan',
    'dbl-click part · focus & follow',
    'dbl-click space · unfocus',
    'hover part · joint gizmo (control on)',
    'drag ring · set joint target',
];

type Vec3 = [number, number, number];

const DEFAULT_CAMERA: { readonly position: Vec3; readonly target: Vec3 } = {
    position: [0, 2, 3],
    target: [0, 1, 0],
};

const savedCamera: { position: Vec3; target: Vec3 } = {
    position: [...DEFAULT_CAMERA.position],
    target: [...DEFAULT_CAMERA.target],
};

const isEditableTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

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
    const localCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const lastWorldCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const isTransitioningRef = useRef<boolean>(false);
    const transitionProgressRef = useRef<number>(0);
    const startCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const startTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const desiredOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());

    const isUserInteractingRef = useRef<boolean>(false);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        const handleStart = () => {
            isUserInteractingRef.current = true;
        };
        const handleEnd = () => {
            isUserInteractingRef.current = false;
        };

        controls.addEventListener('start', handleStart);
        controls.addEventListener('end', handleEnd);
        return () => {
            controls.removeEventListener('start', handleStart);
            controls.removeEventListener('end', handleEnd);
        };
    }, [controlsRef]);

    useEffect(() => {
        if (!robot || !selectedPartName) {
            isTransitioningRef.current = false;
            return;
        }

        const link = robot.links[selectedPartName];
        if (!link) return;

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
            if (isUserInteractingRef.current) {
                lastWorldCenterRef.current.copy(currentWorldCenter);
                return;
            }

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
    const jointAngles = useThrottledJointAngles(isConnected);
    const themeColors = useThemeColors3D();
    const jointPreview = useContext(JointPreviewContext);

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

    const [showGrid, setShowGrid] = useState(true);
    const [wireframe, setWireframe] = useState(false);
    const [selectedPartName, setSelectedPartName] = useState<string | null>(null);
    const [unselectedOpacity, setUnselectedOpacity] = useState<number>(getInitialUnselectedOpacity);

    const handleUnselectedOpacityChange = (val: number) => {
        setUnselectedOpacity(val);
        try {
            localStorage.setItem(STORAGE_KEY_UNSELECTED_OPACITY, String(val));
        } catch {
            // Ignore localStorage errors
        }
    };

    const controlsRef = useRef<OrbitControlsImpl | null>(null);

    const ghostTargetsRef = useRef<GhostTargetMap>(new Map());
    const [ghostJointNames, setGhostJointNames] = useState<string[]>([]);

    const handleTargetChange = useCallback((name: string, targetRad: number, dragging: boolean, commandValue?: number) => {
        if (dragging) {
            ghostTargetsRef.current.forEach((entry, other) => {
                if (other !== name) entry.cancelled = true;
            });
        }
        ghostTargetsRef.current.set(name, { targetRad, dragging, commandValue });
        setGhostJointNames(prev => (prev.includes(name) ? prev : [...prev, name]));
    }, []);

    useEffect(() => {
        if (!joints) return;
        ghostTargetsRef.current.forEach((entry, name) => {
            if (entry.dragging || entry.cancelled || entry.commandValue === undefined) return;
            const state = joints.find(j => j.name === name);
            if (state && Math.abs(state.targetValue - entry.commandValue) > 1e-6) {
                entry.cancelled = true;
            }
        });
    }, [joints]);

    const getPendingTarget = useCallback((name: string) => ghostTargetsRef.current.get(name)?.targetRad, []);

    const handleGhostDone = useCallback((name: string) => {
        if (ghostTargetsRef.current.get(name)?.dragging) return;
        ghostTargetsRef.current.delete(name);
        setGhostJointNames(prev => prev.filter(n => n !== name));
    }, []);

    const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);
    const isGizmoHoveredRef = useRef(false);
    const isGizmoDraggingRef = useRef(false);
    const hoverClearTimerRef = useRef<number | null>(null);
    const lastPartHoverRef = useRef<string | null>(null);

    const cancelHoverClear = useCallback(() => {
        if (hoverClearTimerRef.current !== null) {
            window.clearTimeout(hoverClearTimerRef.current);
            hoverClearTimerRef.current = null;
        }
    }, []);

    const scheduleHoverClear = useCallback(() => {
        cancelHoverClear();
        hoverClearTimerRef.current = window.setTimeout(() => {
            hoverClearTimerRef.current = null;
            if (!isGizmoHoveredRef.current && !isGizmoDraggingRef.current) {
                setHoveredPartName(null);
            }
        }, HOVER_CLEAR_DELAY_MS);
    }, [cancelHoverClear]);

    const handlePartHover = useCallback((name: string | null) => {
        lastPartHoverRef.current = name;
        if (!effectiveControlOn || isGizmoHoveredRef.current || isGizmoDraggingRef.current) return;
        if (name) {
            cancelHoverClear();
            setHoveredPartName(name);
        } else {
            scheduleHoverClear();
        }
    }, [effectiveControlOn, cancelHoverClear, scheduleHoverClear]);

    const releaseGizmoLock = useCallback(() => {
        if (lastPartHoverRef.current) {
            cancelHoverClear();
            setHoveredPartName(lastPartHoverRef.current);
        } else {
            scheduleHoverClear();
        }
    }, [cancelHoverClear, scheduleHoverClear]);

    const handleGizmoHoverChange = useCallback((hovered: boolean) => {
        isGizmoHoveredRef.current = hovered;
        if (hovered) {
            cancelHoverClear();
        } else if (!isGizmoDraggingRef.current) {
            releaseGizmoLock();
        }
    }, [cancelHoverClear, releaseGizmoLock]);

    const handleGizmoDraggingChange = useCallback((dragging: boolean) => {
        isGizmoDraggingRef.current = dragging;
        if (!dragging && !isGizmoHoveredRef.current) {
            releaseGizmoLock();
        }
    }, [releaseGizmoLock]);

    useEffect(() => {
        if (effectiveControlOn) return;
        cancelHoverClear();
        isGizmoHoveredRef.current = false;
        lastPartHoverRef.current = null;
        setHoveredPartName(null);
        ghostTargetsRef.current.clear();
        setGhostJointNames([]);
    }, [effectiveControlOn, cancelHoverClear]);

    useEffect(() => cancelHoverClear, [cancelHoverClear]);

    const initialCamera = useRef({
        position: [...savedCamera.position] as Vec3,
        target: [...savedCamera.target] as Vec3,
    }).current;

    const actuatedJointNames = useMemo(() => getActuatedJointNames(joints), [joints]);

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
        return findJointForLink(link, robot, actuatedJointNames);
    }, [robot, selectedPartName, actuatedJointNames]);

    const hoveredJoint = useMemo(() => {
        if (!robot || !hoveredPartName) return null;
        const link = robot.links[hoveredPartName];
        if (!link) return null;
        const joint = findJointForLink(link, robot, actuatedJointNames);
        return joint && (joint.jointType === 'revolute' || joint.jointType === 'continuous') ? joint : null;
    }, [robot, hoveredPartName, actuatedJointNames]);

    const isPointerInsideRef = useRef(false);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isPointerInsideRef.current && !isEditableTarget(e.target)) {
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

    const handlePartSelect = (linkName: string) => {
        const link = linkName && robot ? robot.links[linkName] : undefined;
        setSelectedPartName(link && robot ? resolveActuatedLinkName(link, robot, actuatedJointNames) : linkName || null);
    };

    const handlePartDoubleClick = (partName: string) => {
        setSelectedPartName(prev => (prev === partName ? null : partName));
    };

    const handlePointerMissed = (e: MouseEvent) => {
        if (e.type === 'dblclick') setSelectedPartName(null);
    };

    const handleResetCamera = () => {
        setSelectedPartName(null);
        const controls = controlsRef.current;
        if (!controls) return;
        controls.target.set(...DEFAULT_CAMERA.target);
        controls.object.position.set(...DEFAULT_CAMERA.position);
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
            onPointerEnter={() => { isPointerInsideRef.current = true; }}
            onPointerLeave={() => { isPointerInsideRef.current = false; }}
        >
            {loading && <LoadingBar progress={progress} />}
            <Canvas
                camera={{ position: initialCamera.position, fov: 50, near: 0.1, far: 500 }}
                style={{ width: '100%', height: '100%', background: 'var(--color-main)', flex: 1 }}
                onPointerMissed={handlePointerMissed}
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
                        wireframe={wireframe}
                        selectedPartName={selectedPartName}
                        unselectedOpacity={unselectedOpacity}
                        focusColor={themeColors.focus}
                        onPartDoubleClick={handlePartDoubleClick}
                        onPartHover={handlePartHover}
                        actuatedJointNames={actuatedJointNames}
                    />
                )}

                {robot && ghostJointNames.map(name => {
                    const joint = robot.joints[name];
                    return joint ? (
                        <JointGhost key={name} joint={joint} targetsRef={ghostTargetsRef} colors={themeColors} onDone={handleGhostDone} />
                    ) : null;
                })}

                <JointRotationGizmo
                    joint={effectiveControlOn ? hoveredJoint : null}
                    isControlOn={effectiveControlOn}
                    joints={joints}
                    onJointValueChange={onJointValueChange}
                    onValuePreview={jointPreview?.set}
                    onTargetChange={handleTargetChange}
                    getPendingTarget={getPendingTarget}
                    onDraggingChange={handleGizmoDraggingChange}
                    onHoverChange={handleGizmoHoverChange}
                    controlsRef={controlsRef}
                    colors={themeColors}
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
                        // chamfer-box draws its border from this variable
                        '--box-border': FOCUS_COLOR,
                    } as React.CSSProperties}
                >
                    <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>FOLLOWING:</span>
                    <span style={{ color: FOCUS_COLOR, fontWeight: 'bold' }}>{selectedPartName}</span>
                    {focusedJoint && (
                        <>
                            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, marginLeft: 6 }}>JOINT:</span>
                            <span style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontWeight: 'bold' }}>{urdfNameOf(focusedJoint)}</span>
                        </>
                    )}
                    <button
                        onClick={() => setSelectedPartName(null)}
                        style={{
                            marginLeft: 4,
                            padding: '2px 8px',
                            background: 'transparent',
                            border: `1px solid ${FOCUS_COLOR}`,
                            color: FOCUS_COLOR,
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
                                onChange={e => handlePartSelect(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--color-main)',
                                    border: '1px solid var(--color-secondary)',
                                    color: selectedPartName ? FOCUS_COLOR : UI_TEXT_PRIMARY_ON_DARK,
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
                                onChange={e => handleUnselectedOpacityChange(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                                title="Transparency of not selected parts"
                            />
                        </div>
                    </div>
                )}

                <SwitchRow label="WIRE" value={wireframe} onChange={setWireframe} />
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
