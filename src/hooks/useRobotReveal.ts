/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * TEMP (tmp/mesh-load-bench): animates a freshly loaded model.
 *   ?reveal=tree  — links pop in from the base along the URDF tree, siblings together, each with a glow flash
 *   ?reveal=sweep — a glowing disc rises from the feet, showing each mesh as it passes its bottom
 *   ?reveal=none  — no animation (default for ?meshes=ros, which streams meshes in)
 *
 * useRobotModel hides each loaded mesh and registers a RevealPlan in revealPlans;
 * this hook plays it. Materials are never touched: the glow is an additive overlay
 * child, so selection/heat/hover material swaps keep working.
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import { MESH_TRANSPORT } from '../Services/ros/handlers/Mesh.handler';
import { lastFrameCostMs } from '../Utils/frameCost';

const browser = typeof window !== 'undefined';
const reducedMotion = browser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
const requested = browser ? new URLSearchParams(window.location.search).get('reveal') : null;
/** TEMP debug: ?glow=0 skips the overlays, to measure their cost. */
const GLOW_ON = !browser || new URLSearchParams(window.location.search).get('glow') !== '0';
export const REVEAL: 'tree' | 'sweep' | 'none' = reducedMotion
    ? 'none'
    : requested === 'tree' || requested === 'sweep' || requested === 'none'
        ? requested
        : MESH_TRANSPORT === 'ros' ? 'none' : 'tree';

/** Plans live here, not in robot.userData: Object3D.clone() JSON-copies userData, so the ghost clone would serialise every mesh. */
export const revealPlans = new WeakMap<THREE.Object3D, RevealPlan>();

/** Fired by useRobotModel once a plan is ready, to wake the on-demand frame loop. */
export const revealEvents = new EventTarget();

const TREE_TOTAL_MS = 1000;
const GLOW_MS = 300;
const SWEEP_MS = 1500;
/** A long frame (shader compile, GPU upload) only advances the animation this much, so it never skips ahead. */
const MAX_FRAME_STEP_MS = 50;

export type RevealPlan = {
    /** Grows as meshes arrive; `loaded` once the last one is in. `expected[d]` = visual meshes at URDF depth d. */
    loaded?: boolean; maxDepth?: number; expected?: number[];
    wallStart?: number; frames?: number; costs?: number[]; gaps?: number[]; last?: number; objects: THREE.Object3D[]; play?: (t: number) => boolean; finish?: () => void; elapsed?: number; done?: boolean };

function linkDepth(o: THREE.Object3D): number {
    let depth = 0;
    for (let p = o.parent; p; p = p.parent) if ('isURDFLink' in p && p.isURDFLink) depth++;
    return depth;
}

function glowMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
}

function treeReveal(
    plan: RevealPlan, color: THREE.Color, gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene,
): Pick<RevealPlan, 'play' | 'finish'> {
    // One layer per URDF depth, strictly in order, at least `step` apart. A layer waits until
    // all its meshes have arrived and their shaders compiled off-thread, so no frame stalls.
    const step = TREE_TOTAL_MS / Math.max(1, plan.maxDepth ?? 1);
    type Layer = { objects: THREE.Object3D[]; compiling: number; mat: THREE.MeshBasicMaterial | null; overlays: THREE.Mesh[]; shownAt: number | null; glowing: boolean };
    const layers: Layer[] = [];
    const layerAt = (d: number) => (layers[d] ??= { objects: [], compiling: 0, mat: null, overlays: [], shownAt: null, glowing: false });
    let seen = 0;
    let cursor = 0;
    let lastShownAt = -Infinity;
    const show = (l: Layer, t: number) => {
        l.objects.forEach(o => { o.visible = true; });
        l.shownAt = t;
        if (!GLOW_ON) return;
        l.mat = glowMaterial(color);
        l.mat.opacity = 0.9;
        l.glowing = true;
        for (const o of l.objects) {
            const meshes: THREE.Mesh[] = [];
            o.traverse(c => { if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh); });
            for (const m of meshes) {
                const g = new THREE.Mesh(m.geometry, l.mat);
                g.raycast = () => {};
                m.add(g);
                l.overlays.push(g);
            }
        }
    };
    return {
        play: (t) => {
            while (seen < plan.objects.length) {
                const o = plan.objects[seen++];
                const l = layerAt(Math.max(0, linkDepth(o) - 1));
                l.objects.push(o);
                l.compiling++;
                // KHR_parallel_shader_compile: drawing an uncompiled mesh would block the frame.
                gl.compileAsync(o, camera, scene).finally(() => {
                    l.compiling--;
                    if (l.shownAt !== null) o.visible = true; // straggler for a layer already shown
                });
            }
            const last = Math.max(plan.maxDepth ?? 0, layers.length - 1);
            while (cursor <= last && t - lastShownAt >= step) {
                const l = layers[cursor];
                const expected = plan.expected?.[cursor] ?? 0;
                if (!l) {
                    if (expected > 0 && !plan.loaded) break;
                    cursor++; // no meshes at this depth: skip without spending a step
                    continue;
                }
                if ((l.objects.length < expected && !plan.loaded) || l.compiling > 0) break;
                show(l, t);
                lastShownAt = t;
                cursor++;
            }
            let running = cursor <= last || !plan.loaded;
            for (const l of layers) {
                if (!l?.glowing || !l.mat) continue;
                const k = (t - l.shownAt!) / GLOW_MS;
                if (k >= 1) {
                    l.glowing = false;
                    l.overlays.forEach(g => { g.visible = false; });
                } else {
                    l.mat.opacity = 0.9 * (1 - k);
                    running = true;
                }
            }
            return running;
        },
        finish: () => {
            plan.objects.forEach(o => { o.visible = true; });
            for (const l of layers) {
                if (!l) continue;
                l.overlays.forEach(g => g.removeFromParent());
                l.mat?.dispose();
            }
        },
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

function sweepReveal(plan: RevealPlan, robot: URDFRobot, scene: THREE.Scene, color: THREE.Color): Pick<RevealPlan, 'play' | 'finish'> {
    robot.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(robot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Whole meshes appear as the disc passes their lowest point: no clipping plane, so no shader recompiles.
    const items = plan.objects.map(o => ({ o, bottom: new THREE.Box3().setFromObject(o).min.y }));
    const mat = new THREE.MeshBasicMaterial({
        map: discTexture(), color, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.75, 64), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(center.x, box.min.y, center.z);
    disc.raycast = () => {};
    scene.add(disc);
    let cleaned = false;
    const finish = () => {
        items.forEach(it => { it.o.visible = true; });
        if (cleaned) return;
        cleaned = true;
        disc.removeFromParent();
        disc.geometry.dispose();
        mat.map?.dispose();
        mat.dispose();
    };
    return {
        play: (t) => {
            const k = Math.min(1, t / SWEEP_MS);
            const y = box.min.y + (size.y + 0.01) * (1 - (1 - k) ** 2);
            for (const it of items) if (!it.o.visible && it.bottom <= y) it.o.visible = true;
            disc.position.y = y;
            mat.opacity = k < 0.8 ? 1 : (1 - k) / 0.2;
            if (k >= 1) { finish(); return false; }
            return true;
        },
        finish,
    };
}

const median = (xs: number[] = []) => Math.round([...xs].sort((a, b) => a - b)[xs.length >> 1] ?? 0);

/** The panel accent (`--color-highlight`) when the viewer passes no focus colour. */
function accentColor(focusColor?: string): THREE.Color {
    const css = getComputedStyle(document.documentElement).getPropertyValue('--color-highlight').trim();
    return new THREE.Color(focusColor || css || '#00ff41');
}

export function useRobotReveal(robot: URDFRobot, focusColor?: string): void {
    const { gl, scene, camera, invalidate } = useThree();

    useEffect(() => {
        const wake = () => invalidate();
        revealEvents.addEventListener('ready', wake);
        return () => {
            revealEvents.removeEventListener('ready', wake);
            const plan = revealPlans.get(robot);
            if (plan && !plan.done) {
                plan.done = true;
                if (plan.finish) plan.finish();
                else plan.objects.forEach(o => { o.visible = true; });
            }
        };
    }, [robot, invalidate]);

    useFrame((_state, delta) => {
        const plan = revealPlans.get(robot);
        if (!plan || plan.done) return;
        if (!plan.play) {
            const color = accentColor(focusColor);
            Object.assign(plan, REVEAL === 'sweep' ? sweepReveal(plan, robot, scene, color) : treeReveal(plan, color, gl, camera, scene));
            plan.wallStart = performance.now();
            plan.frames = 0;
            plan.elapsed = 0;
            // TEMP debug: lets a test (or the console) watch the reveal.
            (window as unknown as { __lucyReveal?: RevealPlan }).__lucyReveal = plan;
            console.info(`[useRobotReveal] ${REVEAL}: ${plan.objects.length} meshes`);
            invalidate();
            return;
        }
        plan.elapsed! += Math.min(delta * 1000, MAX_FRAME_STEP_MS);
        plan.frames! += 1;
        const now = performance.now();
        (plan.costs ??= []).push(lastFrameCostMs());
        if (plan.last) {
            (plan.gaps ??= []).push(now - plan.last);
            if (now - plan.last > 200) console.info(`[useRobotReveal] ${Math.round(now - plan.last)} ms freeze at anim ${Math.round(plan.elapsed!)} ms, ${plan.objects.filter(o => o.visible).length}/${plan.objects.length} shown, loaded=${!!plan.loaded}`);
        }
        plan.last = now;
        if (plan.play!(plan.elapsed!)) invalidate();
        else { plan.done = true; plan.finish?.(); invalidate(); console.info(`[useRobotReveal] done after ${Math.round(plan.elapsed!)} ms of animation, ${Math.round(performance.now() - plan.wallStart!)} ms wall, ${plan.frames} frames, median cost ${median(plan.costs)} ms, median gap ${median(plan.gaps)} ms, max gap ${Math.round(Math.max(...(plan.gaps ?? [0])))} ms`); }
    });
}
