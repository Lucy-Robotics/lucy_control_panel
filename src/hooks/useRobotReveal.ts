/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * TEMP (tmp/mesh-load-bench): animates a freshly loaded model.
 *   ?reveal=tree  — links pop in from the base along the URDF tree, siblings together, each with a glow flash
 *   ?reveal=sweep — a cut plane rises from the feet with a glowing scan disc
 *   ?reveal=none  — no animation (default for ?meshes=ros, which streams meshes in)
 *
 * useRobotModel hides each loaded mesh and stores a RevealPlan on robot.userData.reveal;
 * this hook plays it. Materials are never touched: the glow is an additive overlay
 * child, so selection/heat/hover material swaps keep working.
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import { MESH_TRANSPORT } from '../Services/ros/handlers/Mesh.handler';

const browser = typeof window !== 'undefined';
const reducedMotion = browser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
const requested = browser ? new URLSearchParams(window.location.search).get('reveal') : null;
export const REVEAL: 'tree' | 'sweep' | 'none' = reducedMotion
    ? 'none'
    : requested === 'tree' || requested === 'sweep' || requested === 'none'
        ? requested
        : MESH_TRANSPORT === 'ros' ? 'none' : 'tree';

/** Fired by useRobotModel once a plan is ready, to wake the on-demand frame loop. */
export const revealEvents = new EventTarget();

const TREE_TOTAL_MS = 700;
const GLOW_MS = 400;
const SWEEP_MS = 1000;
const GLOW_COLOR = 0x4fd1ff;

export type RevealPlan = { objects: THREE.Object3D[]; play?: (t: number) => boolean; finish?: () => void; start?: number; done?: boolean };

function linkDepth(o: THREE.Object3D): number {
    let depth = 0;
    for (let p = o.parent; p; p = p.parent) if ('isURDFLink' in p && p.isURDFLink) depth++;
    return depth;
}

function glowMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
        color: GLOW_COLOR, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
}

function treeReveal(plan: RevealPlan): Pick<RevealPlan, 'play' | 'finish'> {
    const depths = plan.objects.map(linkDepth);
    const min = Math.min(...depths);
    const step = TREE_TOTAL_MS / Math.max(1, Math.max(...depths) - min);
    type Item = { o: THREE.Object3D; at: number; overlays: THREE.Mesh[]; mat: THREE.MeshBasicMaterial | null; shown: boolean };
    const items: Item[] = plan.objects.map((o, i) => ({ o, at: (depths[i] - min) * step, overlays: [], mat: null, shown: false }));
    const clearGlow = (it: Item) => {
        it.overlays.forEach(g => g.removeFromParent());
        it.overlays = [];
        it.mat?.dispose();
        it.mat = null;
    };
    return {
        play: (t) => {
            let running = false;
            for (const it of items) {
                if (t < it.at) { running = true; continue; }
                if (!it.shown) {
                    it.shown = true;
                    it.o.visible = true;
                    it.mat = glowMaterial();
                    const meshes: THREE.Mesh[] = [];
                    it.o.traverse(c => { if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh); });
                    for (const m of meshes) {
                        const g = new THREE.Mesh(m.geometry, it.mat);
                        g.raycast = () => {};
                        m.add(g);
                        it.overlays.push(g);
                    }
                }
                if (!it.mat) continue;
                const k = (t - it.at) / GLOW_MS;
                if (k >= 1) clearGlow(it);
                else { it.mat.opacity = 0.9 * (1 - k); running = true; }
            }
            return running;
        },
        finish: () => items.forEach(it => { it.o.visible = true; clearGlow(it); }),
    };
}

function discTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.93, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}

function sweepReveal(plan: RevealPlan, robot: URDFRobot, gl: THREE.WebGLRenderer, scene: THREE.Scene): Pick<RevealPlan, 'play' | 'finish'> {
    plan.objects.forEach(o => { o.visible = true; });
    robot.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(robot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Keeps y <= constant: everything above the cut stays hidden.
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), box.min.y);
    gl.clippingPlanes = [plane];
    const mat = new THREE.MeshBasicMaterial({
        map: discTexture(), color: GLOW_COLOR, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.75, 64), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(center.x, box.min.y, center.z);
    disc.raycast = () => {};
    scene.add(disc);
    let cleaned = false;
    const finish = () => {
        if (cleaned) return;
        cleaned = true;
        gl.clippingPlanes = [];
        disc.removeFromParent();
        disc.geometry.dispose();
        mat.map?.dispose();
        mat.dispose();
    };
    return {
        play: (t) => {
            const k = Math.min(1, t / SWEEP_MS);
            const y = box.min.y + (size.y + 0.01) * (1 - (1 - k) ** 3);
            plane.constant = y;
            disc.position.y = y - 0.001;
            mat.opacity = k < 0.8 ? 1 : (1 - k) / 0.2;
            if (k >= 1) { finish(); return false; }
            return true;
        },
        finish,
    };
}

export function useRobotReveal(robot: URDFRobot): void {
    const { gl, scene, invalidate } = useThree();

    useEffect(() => {
        const wake = () => invalidate();
        revealEvents.addEventListener('ready', wake);
        return () => {
            revealEvents.removeEventListener('ready', wake);
            const plan = robot.userData.reveal as RevealPlan | undefined;
            if (plan && !plan.done) {
                plan.done = true;
                if (plan.finish) plan.finish();
                else plan.objects.forEach(o => { o.visible = true; });
            }
        };
    }, [robot, invalidate]);

    useFrame(() => {
        const plan = robot.userData.reveal as RevealPlan | undefined;
        if (!plan || plan.done) return;
        if (!plan.play) {
            Object.assign(plan, REVEAL === 'sweep' ? sweepReveal(plan, robot, gl, scene) : treeReveal(plan));
            plan.start = performance.now();
        }
        if (plan.play!(performance.now() - plan.start!)) invalidate();
        else { plan.done = true; plan.finish?.(); invalidate(); }
    });
}
