/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback, useContext } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { Slider, Typography } from 'antd';
import { RobotFKModel } from '../Components/RobotFKModel';
import { JointRotationGizmo } from '../Components/JointRotationGizmo';
import { JointGhost, type GhostTargetMap } from '../Components/JointGhost';
import { ViewCube } from '../Components/ViewCube';
import { CameraViewTween, type ViewRequest } from '../Components/CameraViewTween';
import { usePersistentBoolean } from '../hooks/usePersistentBoolean';
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
import {
    CAMERA_FOV,
    MAX_CAMERA_DISTANCE,
    MIN_CAMERA_DISTANCE,
    distanceForZoom,
    getRobotBoundingBox,
    zoomForDistance,
} from '../Utils/camera.utils';
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
const STORAGE_KEY_ORTHOGRAPHIC = 'lucy_3d_orthographic';

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

const SETTINGS_BOX_WIDTH = 165;
const FOCUS_COLOR = 'var(--color-highlight)';
const CLICK_DELAY_MS = 250;
const MOUSE_HINTS = [
    'L-drag · rotate',
    'scroll · zoom',
    'R-drag · pan',
    'dbl-click part · focus & follow',
    'dbl-click space · unfocus',
    'click part · joint gizmo (control on)',
    'click space · hide gizmo',
    'drag ring · set joint target',
    'click cube · snap view',
];

type Vec3 = [number, number, number];

const DEFAULT_CAMERA: { readonly position: Vec3; readonly target: Vec3 } = {
    position: [0, 2, 3],
    target: [0, 1, 0],
};

const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(...DEFAULT_CAMERA.position)
    .sub(new THREE.Vector3(...DEFAULT_CAMERA.target))
    .normalize();

const savedCamera: { position: Vec3; target: Vec3 } = {
    position: [...DEFAULT_CAMERA.position],
    target: [...DEFAULT_CAMERA.target],
};
let framedRobot: URDFRobot | null = null;

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
    fontSize: 11,
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

/** Overlay panel that starts collapsed to its title and expands on click. */
const CollapsibleOverlay: React.FC<{
    title: string;
    style: React.CSSProperties;
    gap?: number;
    children: React.ReactNode;
}> = ({ title, style, gap = 4, children }) => {
    const [expanded, setExpanded] = useState(false);
    const toggle = () => setExpanded(prev => !prev);

    return (
        <div
            className={`chamfer-box viewer-overlay-box collapsible${expanded ? ' expanded' : ''}`}
            style={{ ...OVERLAY_BOX, ...style }}
        >
            <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                className="collapsible-header"
                onClick={toggle}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
                title={expanded ? `Collapse ${title.toLowerCase()}` : `Expand ${title.toLowerCase()}`}
            >
                <span className="collapsible-chevron">▸</span>
                <span className="collapsible-title">{title}</span>
            </div>
            <div className="collapsible-body">
                <div className="collapsible-body-inner" style={{ gap }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const InfoBadge: React.FC<{
    label: string;
    partName: string;
    jointName?: string;
    onUnfocus?: () => void;
}> = ({ label, partName, jointName, onUnfocus }) => (
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
            pointerEvents: 'none',
            // chamfer-box draws its border from this variable
            '--box-border': FOCUS_COLOR,
        } as React.CSSProperties}
    >
        <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>{label}</span>
        <span style={{ color: FOCUS_COLOR, fontWeight: 'bold' }}>{partName}</span>
        {jointName && (
            <>
                <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, marginLeft: 6 }}>JOINT:</span>
                <span style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontWeight: 'bold' }}>{jointName}</span>
            </>
        )}
        {onUnfocus && (
            <button
                onClick={onUnfocus}
                style={{
                    marginLeft: 6,
                    padding: '1px 6px',
                    background: 'transparent',
                    border: `1px solid ${FOCUS_COLOR}`,
                    color: FOCUS_COLOR,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    borderRadius: 2,
                    pointerEvents: 'auto',
                }}
                title="Stop following this part"
            >
                UNFOCUS
            </button>
        )}
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
    const camera = useThree(s => s.camera);
    const orbitControls = useThree(s => s.controls);
    const viewportHeight = useThree(s => s.size.height);
    const startZoomRef = useRef<number>(1);
    const targetZoomRef = useRef<number | null>(null);
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
    }, [controlsRef, orbitControls]);

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
            // Ortho size doesn't depend on distance, so frame the part through zoom
            if (camera instanceof THREE.OrthographicCamera) {
                startZoomRef.current = camera.zoom;
                targetZoomRef.current = zoomForDistance(framingDist, viewportHeight);
            } else {
                targetZoomRef.current = null;
            }
            isTransitioningRef.current = true;
            transitionProgressRef.current = 0;
        }
        // Resizing must not re-trigger the framing transition
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (targetZoomRef.current !== null && camera instanceof THREE.OrthographicCamera) {
                camera.zoom = THREE.MathUtils.lerp(startZoomRef.current, targetZoomRef.current, ease);
                camera.updateProjectionMatrix();
            }
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

const ProjectionSync: React.FC<{ controlsRef: React.RefObject<OrbitControlsImpl | null> }> = ({ controlsRef }) => {
    const camera = useThree(s => s.camera);
    const viewportHeight = useThree(s => s.size.height);
    const prevCameraRef = useRef<THREE.Camera | null>(null);
    const lastTargetRef = useRef(new THREE.Vector3(...savedCamera.target));

    useFrame(() => {
        const controls = controlsRef.current;
        if (controls) lastTargetRef.current.copy(controls.target);
    });

    useLayoutEffect(() => {
        const prev = prevCameraRef.current;
        prevCameraRef.current = camera;
        if (prev === camera) return;

        const target = lastTargetRef.current.clone();
        const fromPosition = prev ? prev.position.clone() : new THREE.Vector3(...savedCamera.position);
        const offset = fromPosition.clone().sub(target);
        const distance = Math.max(offset.length(), MIN_CAMERA_DISTANCE);
        const dir = offset.lengthSq() > 1e-12 ? offset.normalize() : new THREE.Vector3(0, 0, 1);

        if (camera instanceof THREE.OrthographicCamera) {
            camera.zoom = zoomForDistance(distance, viewportHeight);
            camera.position.copy(target).addScaledVector(dir, distance);
        } else {
            const perspectiveDistance = prev instanceof THREE.OrthographicCamera
                ? THREE.MathUtils.clamp(distanceForZoom(prev.zoom, viewportHeight), MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)
                : distance;
            camera.position.copy(target).addScaledVector(dir, perspectiveDistance);
        }
        camera.lookAt(target);
        if (camera instanceof THREE.OrthographicCamera || camera instanceof THREE.PerspectiveCamera) {
            camera.updateProjectionMatrix();
        }

        const controls = controlsRef.current;
        if (controls) {
            controls.target.copy(target);
            controls.update();
        }
    }, [camera, controlsRef, viewportHeight]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.minZoom = zoomForDistance(MAX_CAMERA_DISTANCE, viewportHeight);
        controls.maxZoom = zoomForDistance(MIN_CAMERA_DISTANCE, viewportHeight);
    }, [camera, controlsRef, viewportHeight]);

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
    const [orthographic, setOrthographic] = usePersistentBoolean(STORAGE_KEY_ORTHOGRAPHIC);
    const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null);

    const handleSelectView = useCallback((direction: THREE.Vector3, instant = false) => {
        setViewRequest(prev => ({ id: (prev?.id ?? 0) + 1, direction, instant }));
    }, []);
    const [selectedPartName, setSelectedPartName] = useState<string | null>(null);

    const getFramingBox = useCallback((): THREE.Box3 | null => {
        if (!robot) return null;
        const link = selectedPartName ? robot.links[selectedPartName] : undefined;
        if (!link) return getRobotBoundingBox(robot);
        link.updateWorldMatrix(true, true);
        return getLinkBoundingBox(link);
    }, [robot, selectedPartName]);

    const loadedOnMountRef = useRef(robot !== null && !loading);
    const userMovedCameraRef = useRef(false);
    useEffect(() => {
        if (!robot || loading || framedRobot === robot) return;
        framedRobot = robot;
        if (userMovedCameraRef.current) return;
        handleSelectView(DEFAULT_VIEW_DIRECTION.clone(), loadedOnMountRef.current);
    }, [robot, loading, handleSelectView]);

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
            // Only one drag can be live: an entry still flagged as dragging here
            // lost its release event, and would otherwise never fade out.
            ghostTargetsRef.current.forEach((entry, other) => {
                if (other === name) return;
                entry.dragging = false;
                entry.cancelled = true;
            });
        }
        ghostTargetsRef.current.set(name, { targetRad, dragging, commandValue });
        setGhostJointNames(prev => (prev.includes(name) ? prev : [...prev, name]));
    }, []);

    const handleTargetCancel = useCallback((name: string) => {
        const entry = ghostTargetsRef.current.get(name);
        if (!entry) return;
        entry.dragging = false;
        entry.cancelled = true;
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
    const [gizmoPartName, setGizmoPartName] = useState<string | null>(null);
    const pendingClickTimerRef = useRef<number | null>(null);

    const cancelPendingClick = useCallback(() => {
        if (pendingClickTimerRef.current !== null) {
            window.clearTimeout(pendingClickTimerRef.current);
            pendingClickTimerRef.current = null;
        }
    }, []);

    // Single clicks wait out the double-click window, so a double-click
    // focuses without briefly opening the gizmo first.
    const scheduleClick = useCallback((action: () => void) => {
        cancelPendingClick();
        pendingClickTimerRef.current = window.setTimeout(() => {
            pendingClickTimerRef.current = null;
            action();
        }, CLICK_DELAY_MS);
    }, [cancelPendingClick]);

    const handlePartClick = useCallback((name: string) => {
        if (!effectiveControlOn) return;
        scheduleClick(() => setGizmoPartName(prev => (prev === name ? null : name)));
    }, [effectiveControlOn, scheduleClick]);

    useEffect(() => {
        if (effectiveControlOn) return;
        cancelPendingClick();
        setGizmoPartName(null);
        ghostTargetsRef.current.clear();
        setGhostJointNames([]);
    }, [effectiveControlOn, cancelPendingClick]);

    useEffect(() => cancelPendingClick, [cancelPendingClick]);

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

    const gizmoJoint = useMemo(() => {
        if (!robot || !gizmoPartName) return null;
        const link = robot.links[gizmoPartName];
        if (!link) return null;
        const joint = findJointForLink(link, robot, actuatedJointNames);
        return joint && (joint.jointType === 'revolute' || joint.jointType === 'continuous') ? joint : null;
    }, [robot, gizmoPartName, actuatedJointNames]);

    const hoveredJoint = useMemo(() => {
        if (!robot || !hoveredPartName) return null;
        const link = robot.links[hoveredPartName];
        if (!link) return null;
        return findJointForLink(link, robot, actuatedJointNames);
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
        cancelPendingClick();
        setSelectedPartName(prev => (prev === partName ? null : partName));
    };

    const handlePointerMissed = (e: MouseEvent) => {
        if (e.type === 'dblclick') {
            cancelPendingClick();
            setSelectedPartName(null);
        } else if (e.type === 'click' && e.detail <= 1) {
            scheduleClick(() => setGizmoPartName(null));
        }
    };

    const handleResetCamera = () => {
        setSelectedPartName(null);
        if (robot) {
            handleSelectView(DEFAULT_VIEW_DIRECTION.clone());
            return;
        }
        const controls = controlsRef.current;
        if (!controls) return;
        controls.target.set(...DEFAULT_CAMERA.target);
        controls.object.position.set(...DEFAULT_CAMERA.position);
        if (controls.object instanceof THREE.OrthographicCamera) {
            const distance = new THREE.Vector3(...DEFAULT_CAMERA.position).distanceTo(new THREE.Vector3(...DEFAULT_CAMERA.target));
            controls.object.zoom = zoomForDistance(distance, controls.domElement?.clientHeight ?? window.innerHeight);
            controls.object.updateProjectionMatrix();
        }
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
                style={{ width: '100%', height: '100%', background: 'var(--color-main)', flex: 1 }}
                onPointerMissed={handlePointerMissed}
            >
                {orthographic ? (
                    <OrthographicCamera makeDefault position={initialCamera.position} near={-50} far={500} />
                ) : (
                    <PerspectiveCamera makeDefault position={initialCamera.position} fov={CAMERA_FOV} near={0.1} far={500} />
                )}
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color={UI_ACCENT_GREEN_HEX} />

                {showGrid && (
                    <Grid
                        args={[30, 30]}
                        cellSize={1}
                        cellThickness={0}
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
                        focusColor={themeColors.accent}
                        onPartClick={handlePartClick}
                        onPartDoubleClick={handlePartDoubleClick}
                        onPartHover={setHoveredPartName}
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
                    joint={effectiveControlOn ? gizmoJoint : null}
                    isControlOn={effectiveControlOn}
                    joints={joints}
                    onJointValueChange={onJointValueChange}
                    onValuePreview={jointPreview?.set}
                    onTargetChange={handleTargetChange}
                    onTargetCancel={handleTargetCancel}
                    getPendingTarget={getPendingTarget}
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
                    onStart={() => { userMovedCameraRef.current = true; }}
                    enablePan
                    enableZoom
                    enableRotate
                    dampingFactor={0.1}
                    minDistance={MIN_CAMERA_DISTANCE}
                    maxDistance={MAX_CAMERA_DISTANCE}
                />

                <ProjectionSync controlsRef={controlsRef} />
                <CameraViewTween request={viewRequest} controlsRef={controlsRef} getFramingBox={getFramingBox} />
                <ViewCube colors={themeColors} onSelectView={handleSelectView} />
            </Canvas>

            {/* Controls hint — top-left */}
            <CollapsibleOverlay title="CONTROLS (HELP)" style={{ top: 10, userSelect: 'none' }}>
                <div style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, lineHeight: 1.6 }}>
                    {MOUSE_HINTS.map(hint => <div key={hint}>• {hint}</div>)}
                </div>
            </CollapsibleOverlay>

            {/* Hovered joint / followed part badge — bottom-center */}
            {hoveredPartName && hoveredJoint ? (
                <InfoBadge label="HOVER:" partName={hoveredPartName} jointName={urdfNameOf(hoveredJoint)} />
            ) : selectedPartName && (
                <InfoBadge
                    label="FOLLOWING:"
                    partName={selectedPartName}
                    jointName={focusedJoint ? urdfNameOf(focusedJoint) : undefined}
                    onUnfocus={() => setSelectedPartName(null)}
                />
            )}

            {/* Settings */}
            <CollapsibleOverlay
                title="SETTINGS"
                style={{ top: 10, left: 'auto', right: 10, width: SETTINGS_BOX_WIDTH }}
                gap={6}
            >
                {/* Part selector & transparency of unselected parts */}
                {availableParts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>PART FOCUS</span>
                            <select
                                value={selectedPartName || ''}
                                onChange={e => handlePartSelect(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--color-main)',
                                    border: '1px solid var(--color-secondary)',
                                    color: selectedPartName ? FOCUS_COLOR : UI_TEXT_PRIMARY_ON_DARK,
                                    fontFamily: 'monospace',
                                    fontSize: 10,
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
                                <span style={{ color: selectedPartName ? 'var(--color-highlight)' : UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>
                                    OTHER OPACITY
                                </span>
                                <span style={{ color: selectedPartName ? 'var(--color-highlight)' : UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>
                                    {Math.round(unselectedOpacity * 100)}%
                                </span>
                            </div>
                            <Slider
                                min={0}
                                max={1}
                                step={0.05}
                                value={unselectedOpacity}
                                onChange={handleUnselectedOpacityChange}
                                style={{ margin: 0 }}
                                tooltip={{ open: false }}
                            />
                        </div>
                    </div>
                )}

                <SwitchRow label="WIRE" value={wireframe} onChange={setWireframe} />
                <SwitchRow label="GRID" value={showGrid} onChange={setShowGrid} />
                <SwitchRow label="ORTHO" value={orthographic} onChange={setOrthographic} />

                <button
                    onClick={handleResetCamera}
                    style={{
                        width: '100%',
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid var(--color-secondary)',
                        color: UI_TEXT_SECONDARY_MUTED,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        borderRadius: 2,
                        marginTop: 2,
                        textAlign: 'center',
                    }}
                    title="Reset camera to default position"
                >
                    RESET CAMERA
                </button>
            </CollapsibleOverlay>
        </div>
    );
};

export default Robot3DViewer;
