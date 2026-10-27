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

const SIZE = 90;
const CUBE_HALF_PX = SIZE / 2;
const CUBE_MARGIN_PX = SIZE;
const BOTTOM_OFFSET_PX = 50;
const CHAMFER = 0.28;
const LABEL_OFFSET = 0.01;
const LABEL_TEXTURE_PX = 128;
const INNER = 1 - CHAMFER;

type Axis = 0 | 1 | 2;
type Sign = 1 | -1;

interface CubePiece {
    key: string;
    kind: 'face' | 'edge' | 'corner';
    geometry: THREE.BufferGeometry;
    direction: THREE.Vector3;
}

interface FaceLabel {
    text: string;
    normal: THREE.Vector3;
    right: THREE.Vector3;
    up: THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const FACE_LABELS: FaceLabel[] = [
    { text: 'FRONT', normal: v(1, 0, 0), right: v(0, 0, -1), up: v(0, 1, 0) },
    { text: 'BACK', normal: v(-1, 0, 0), right: v(0, 0, 1), up: v(0, 1, 0) },
    { text: 'RIGHT', normal: v(0, 0, 1), right: v(1, 0, 0), up: v(0, 1, 0) },
    { text: 'LEFT', normal: v(0, 0, -1), right: v(-1, 0, 0), up: v(0, 1, 0) },
    { text: 'TOP', normal: v(0, 1, 0), right: v(0, 0, -1), up: v(-1, 0, 0) },
    { text: 'BOTTOM', normal: v(0, -1, 0), right: v(0, 0, -1), up: v(1, 0, 0) },
];

const point = (coords: Record<Axis, number>) => v(coords[0], coords[1], coords[2]);

function polygonGeometry(vertices: THREE.Vector3[], outward: THREE.Vector3): THREE.BufferGeometry {
    const normal = new THREE.Vector3()
        .subVectors(vertices[1], vertices[0])
        .cross(new THREE.Vector3().subVectors(vertices[2], vertices[0]));
    const ordered = normal.dot(outward) < 0 ? [...vertices].reverse() : vertices;
    const positions: number[] = [];
    for (let i = 1; i < ordered.length - 1; i++) {
        for (const p of [ordered[0], ordered[i], ordered[i + 1]]) positions.push(p.x, p.y, p.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}

function buildViewCubePieces(): CubePiece[] {
    const pieces: CubePiece[] = [];
    const axes: Axis[] = [0, 1, 2];
    const signs: Sign[] = [1, -1];
    const others = (a: Axis): [Axis, Axis] => axes.filter(x => x !== a) as [Axis, Axis];

    for (const i of axes) {
        for (const s of signs) {
            const [j, k] = others(i);
            const corners: [number, number][] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
            const verts = corners.map(([a, b]) => point({ [i]: s, [j]: a * INNER, [k]: b * INNER } as Record<Axis, number>));
            const direction = point({ [i]: s, [j]: 0, [k]: 0 } as Record<Axis, number>);
            pieces.push({ key: `face-${i}${s}`, kind: 'face', geometry: polygonGeometry(verts, direction), direction });
        }
    }

    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as [Axis, Axis][]) {
        const k = axes.find(x => x !== i && x !== j)!;
        for (const si of signs) {
            for (const sj of signs) {
                const at = (onI: number, onJ: number, onK: number) =>
                    point({ [i]: onI, [j]: onJ, [k]: onK } as Record<Axis, number>);
                const verts = [
                    at(si, sj * INNER, -INNER),
                    at(si, sj * INNER, INNER),
                    at(si * INNER, sj, INNER),
                    at(si * INNER, sj, -INNER),
                ];
                const direction = at(si, sj, 0).normalize();
                pieces.push({ key: `edge-${i}${si}-${j}${sj}`, kind: 'edge', geometry: polygonGeometry(verts, direction), direction });
            }
        }
    }

    for (const sx of signs) {
        for (const sy of signs) {
            for (const sz of signs) {
                const verts = [
                    v(sx, sy * INNER, sz * INNER),
                    v(sx * INNER, sy, sz * INNER),
                    v(sx * INNER, sy * INNER, sz),
                ];
                const direction = v(sx, sy, sz).normalize();
                pieces.push({ key: `corner-${sx}${sy}${sz}`, kind: 'corner', geometry: polygonGeometry(verts, direction), direction });
            }
        }
    }

    return pieces;
}

function labelTexture(text: string, color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = LABEL_TEXTURE_PX;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${text.length > 5 ? 22 : 26}px monospace`;
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
}

const ViewCubeScene: React.FC<ViewCubeSceneProps> = ({ mainCamera, colors, onSelectView }) => {
    const size = useThree(s => s.size);
    const gl = useThree(s => s.gl);
    const cubeRef = useRef<THREE.Group>(null);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const pieces = useMemo(buildViewCubePieces, []);
    useEffect(() => () => pieces.forEach(p => p.geometry.dispose()), [pieces]);

    const mats = useMemo(() => ({
        face: new THREE.MeshBasicMaterial({ toneMapped: false }),
        chamfer: new THREE.MeshBasicMaterial({ toneMapped: false }),
        hover: new THREE.MeshBasicMaterial({ toneMapped: false }),
    }), []);
    useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);
    useEffect(() => {
        mats.face.color.set(colors.surface);
        mats.chamfer.color.set(colors.border);
        mats.hover.color.set(colors.accent);
    }, [mats, colors]);

    const labels = useMemo(() => FACE_LABELS.map(label => {
        const texture = labelTexture(label.text, colors.active);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(label.right, label.up, label.normal),
        );
        const position = label.normal.clone().multiplyScalar(1 + LABEL_OFFSET);
        return { text: label.text, texture, quaternion, position };
    }), [colors.active]);
    useEffect(() => () => labels.forEach(l => l.texture.dispose()), [labels]);

    const labelGeometry = useMemo(() => new THREE.PlaneGeometry(2 * INNER, 2 * INNER), []);
    useEffect(() => () => labelGeometry.dispose(), [labelGeometry]);

    useFrame(() => {
        cubeRef.current?.quaternion.copy(mainCamera.quaternion).invert();
    });

    useEffect(() => () => {
        gl.domElement.style.cursor = 'auto';
    }, [gl]);

    const stop = (e: ThreeEvent<MouseEvent | PointerEvent>) => e.stopPropagation();

    const handleOver = (e: ThreeEvent<PointerEvent>, key: string) => {
        e.stopPropagation();
        setHoveredKey(key);
        gl.domElement.style.cursor = 'pointer';
    };

    const handleOut = (key: string) => {
        setHoveredKey(prev => (prev === key ? null : prev));
        gl.domElement.style.cursor = 'auto';
    };

    const handleClick = (e: ThreeEvent<MouseEvent>, direction: THREE.Vector3) => {
        e.stopPropagation();
        if (e.delta > CLICK_DRAG_THRESHOLD_PX) return;
        onSelectView(direction.clone());
    };

    return (
        <>
            <OrthographicCamera makeDefault position={[0, 0, 200]} />
            <group position={[size.width / 2 - CUBE_MARGIN_PX, -size.height / 2 + CUBE_MARGIN_PX + BOTTOM_OFFSET_PX, 0]}>
                <group ref={cubeRef} scale={CUBE_HALF_PX}>
                    {pieces.map(piece => (
                        <mesh
                            key={piece.key}
                            geometry={piece.geometry}
                            material={hoveredKey === piece.key ? mats.hover : piece.kind === 'face' ? mats.face : mats.chamfer}
                            onPointerOver={e => handleOver(e, piece.key)}
                            onPointerOut={() => handleOut(piece.key)}
                            onPointerDown={stop}
                            onClick={e => handleClick(e, piece.direction)}
                            onDoubleClick={stop}
                        >
                            <Edges color={colors.border} raycast={noRaycast} />
                        </mesh>
                    ))}
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
}

export const ViewCube: React.FC<ViewCubeProps> = ({ colors, onSelectView }) => {
    const mainCamera = useThree(s => s.camera);
    return (
        <Hud renderPriority={1}>
            <ViewCubeScene mainCamera={mainCamera} colors={colors} onSelectView={onSelectView} />
        </Hud>
    );
};
