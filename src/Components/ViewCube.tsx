/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, Hud, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { ThemeColors3D } from '../hooks/useThemeColors3D';
import { CLICK_DRAG_THRESHOLD_PX } from '../Utils/robotModel.utils';
import { buildHoverPatches } from '../Utils/viewCubeHoverPatches';
import { pickCubePiece } from '../Utils/viewCubePick';

const CUBE_HALF_PX = 30;
const CHAMFER = 0.4;
const EDGE_GAP_PX = 10;
const LABEL_OFFSET = 0.01;
const LABEL_TEXTURE_PX = 128;
const INNER = 1 - CHAMFER;
const CUBE_RADIUS_PX = CUBE_HALF_PX * Math.sqrt(3);
const CUBE_MARGIN_PX = EDGE_GAP_PX + CUBE_RADIUS_PX;
const HOVER_REFRESH_ANGLE = 1e-3;

interface FaceLabel {
    text: string;
    normal: THREE.Vector3;
    right: THREE.Vector3;
    up: THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Faces use the robot's URDF axes (Z-up), not Three.js ones.
const FACE_LABELS: FaceLabel[] = [
    { text: '+X', normal: v(1, 0, 0), right: v(0, 0, -1), up: v(0, 1, 0) },
    { text: '−X', normal: v(-1, 0, 0), right: v(0, 0, 1), up: v(0, 1, 0) },
    { text: '−Y', normal: v(0, 0, 1), right: v(1, 0, 0), up: v(0, 1, 0) },
    { text: '+Y', normal: v(0, 0, -1), right: v(-1, 0, 0), up: v(0, 1, 0) },
    { text: '+Z', normal: v(0, 1, 0), right: v(0, 0, -1), up: v(-1, 0, 0) },
    { text: '−Z', normal: v(0, -1, 0), right: v(0, 0, -1), up: v(1, 0, 0) },
];

function labelTexture(text: string, color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = LABEL_TEXTURE_PX;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px monospace';
    ctx.fillText(text, LABEL_TEXTURE_PX / 2, LABEL_TEXTURE_PX / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const noRaycast = () => null;

interface ViewCubeSceneProps {
    mainCamera: THREE.Camera;
    colors: ThemeColors3D;
    onSelectView: (direction: THREE.Vector3) => void;
    centerRight: number;
    bottomInset: number;
}

const ViewCubeScene: React.FC<ViewCubeSceneProps> = ({ mainCamera, colors, onSelectView, centerRight, bottomInset }) => {
    const size = useThree(s => s.size);
    const gl = useThree(s => s.gl);
    const events = useThree(s => s.events);
    const pointer = useThree(s => s.pointer);
    const cubeRef = useRef<THREE.Group>(null);
    const pointerInsideRef = useRef(false);
    const lastRefreshQuat = useMemo(() => new THREE.Quaternion(), []);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const box = useMemo(() => new THREE.BoxGeometry(2, 2, 2), []);
    const hoverPatches = useMemo(() => buildHoverPatches(CHAMFER), []);
    useEffect(() => () => {
        box.dispose();
        hoverPatches.forEach(g => g.dispose());
    }, [box, hoverPatches]);
    const hoveredPatch = hoveredKey ? hoverPatches.get(hoveredKey) : undefined;

    const mats = useMemo(() => ({
        face: new THREE.MeshBasicMaterial({ toneMapped: false }),
        hover: new THREE.MeshBasicMaterial({ toneMapped: false }),
    }), []);
    useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);
    useEffect(() => {
        mats.face.color.set(colors.surface);
        mats.hover.color.set(colors.accent);
    }, [mats, colors]);

    const edgeColor = useMemo(
        () => `#${new THREE.Color(colors.border).lerp(new THREE.Color(colors.text), 0.25).getHexString()}`,
        [colors.border, colors.text],
    );

    const labelColor = useMemo(
        () => `#${new THREE.Color(colors.surface).lerp(new THREE.Color(colors.text), 0.24).getHexString()}`,
        [colors.surface, colors.text],
    );

    const labels = useMemo(() => FACE_LABELS.map(label => {
        const texture = labelTexture(label.text, labelColor);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(label.right, label.up, label.normal),
        );
        const position = label.normal.clone().multiplyScalar(1 + LABEL_OFFSET);
        return { text: label.text, texture, quaternion, position };
    }), [labelColor]);
    useEffect(() => () => labels.forEach(l => l.texture.dispose()), [labels]);

    const labelGeometry = useMemo(() => new THREE.PlaneGeometry(2 * INNER, 2 * INNER), []);
    useEffect(() => () => labelGeometry.dispose(), [labelGeometry]);

    useEffect(() => {
        const el = gl.domElement;
        const inside = () => { pointerInsideRef.current = true; };
        const outside = () => { pointerInsideRef.current = false; };
        el.addEventListener('pointermove', inside);
        el.addEventListener('pointerleave', outside);
        return () => {
            el.removeEventListener('pointermove', inside);
            el.removeEventListener('pointerleave', outside);
        };
    }, [gl]);

    const cubeCenter = useMemo(() => new THREE.Vector2(
        size.width / 2 - centerRight,
        -size.height / 2 + bottomInset + CUBE_RADIUS_PX,
    ), [size, centerRight, bottomInset]);

    useFrame(() => {
        const cube = cubeRef.current;
        if (!cube) return;
        cube.quaternion.copy(mainCamera.quaternion).invert();

        if (lastRefreshQuat.angleTo(cube.quaternion) < HOVER_REFRESH_ANGLE) return;
        lastRefreshQuat.copy(cube.quaternion);
        if (!pointerInsideRef.current) return;
        const dx = pointer.x * size.width / 2 - cubeCenter.x;
        const dy = pointer.y * size.height / 2 - cubeCenter.y;
        if (Math.hypot(dx, dy) <= CUBE_RADIUS_PX) events.update?.();
    });

    useEffect(() => () => {
        gl.domElement.style.cursor = 'auto';
    }, [gl]);

    const stop = (e: ThreeEvent<MouseEvent | PointerEvent>) => e.stopPropagation();

    const pieceUnder = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
        pickCubePiece(cubeRef.current!.worldToLocal(e.point.clone()), CHAMFER);

    const handleMove = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredKey(pieceUnder(e).key);
        gl.domElement.style.cursor = 'pointer';
    };

    const handleOut = () => {
        setHoveredKey(null);
        gl.domElement.style.cursor = 'auto';
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > CLICK_DRAG_THRESHOLD_PX) return;
        onSelectView(pieceUnder(e).direction);
    };

    return (
        <>
            <OrthographicCamera makeDefault position={[0, 0, 200]} />
            <group position={[cubeCenter.x, cubeCenter.y, 0]}>
                <group ref={cubeRef} scale={CUBE_HALF_PX}>
                    <mesh
                        geometry={box}
                        material={mats.face}
                        onPointerMove={handleMove}
                        onPointerOut={handleOut}
                        onPointerDown={stop}
                        onClick={handleClick}
                        onDoubleClick={stop}
                    >
                        <Edges color={edgeColor} raycast={noRaycast} />
                    </mesh>
                    {hoveredPatch && <mesh geometry={hoveredPatch} material={mats.hover} raycast={noRaycast} />}
                    {labels.map(label => (
                        <mesh
                            key={label.text}
                            geometry={labelGeometry}
                            position={label.position}
                            quaternion={label.quaternion}
                            raycast={noRaycast}
                        >
                            <meshBasicMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            </group>
        </>
    );
};

export interface ViewCubeProps {
    colors: ThemeColors3D;
    onSelectView: (direction: THREE.Vector3) => void;
    centerRight?: number;
    bottomInset?: number;
}

export const ViewCube: React.FC<ViewCubeProps> = ({
    colors,
    onSelectView,
    centerRight = CUBE_MARGIN_PX,
    bottomInset = EDGE_GAP_PX,
}) => {
    const mainCamera = useThree(s => s.camera);
    return (
        <Hud renderPriority={1}>
            <ViewCubeScene
                mainCamera={mainCamera}
                colors={colors}
                onSelectView={onSelectView}
                centerRight={centerRight}
                bottomInset={bottomInset}
            />
        </Hud>
    );
};
