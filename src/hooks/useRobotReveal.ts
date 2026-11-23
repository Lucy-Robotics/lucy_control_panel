/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * TEMP (tmp/mesh-load-bench): animates a freshly loaded model.
 *   ?reveal=tree  — links fade in from the base down the URDF tree, one depth at a time
 *   ?reveal=sweep — a glowing disc rises from the feet, showing each mesh as it passes its bottom
 *   ?reveal=none  — no animation (default for ?meshes=ros, which streams meshes in)
 *
 * useRobotModel hides each loaded mesh and registers a RevealPlan in revealPlans;
 * this hook plays it. The tree fade swaps in transparent material clones
 * only for its 300 ms, and only restores a mesh whose material it still owns.
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
export const REVEAL: 'tree' | 'sweep' | 'none' = reducedMotion
    ? 'none'
    : requested === 'tree' || requested === 'sweep' || requested === 'none'
        ? requested
        : MESH_TRANSPORT === 'ros' ? 'none' : 'tree';

/** Plans live here, not in robot.userData: Object3D.clone() JSON-copies userData, so the ghost clone would serialise every mesh. */
export const revealPlans = new WeakMap<THREE.Object3D, RevealPlan>();

/** Fired by useRobotModel once a plan is ready, to wake the on-demand frame loop. */
export const revealEvents = new EventTarget();

const TREE_TOTAL_MS = 650;
const FADE_MS = 300;
const SWEEP_MS = 1100;
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

function treeReveal(
    plan: RevealPlan, gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene,
): Pick<RevealPlan, 'play' | 'finish'> {
    // One layer per URDF depth, strictly in order, on an ease-out schedule. A layer waits until all
    // its meshes have arrived and their shaders compiled off-thread, so no frame stalls.
    // Ease-out schedule: layer i is due at T·(1 − √(1 − i/n)), so early layers come fast and the last ones settle.
    const n = Math.max(1, plan.maxDepth ?? 1);
    const due = (i: number) => TREE_TOTAL_MS * (1 - Math.sqrt(1 - Math.min(1, Math.max(0, i) / n)));
    const step = (i: number) => due(i) - due(i - 1);
    // Each mesh fades in through a transparent clone of its material; the original comes back when the fade ends.
    // Both variants are compiled before the layer shows ('opaque' is a program key in three r177).
    type Fade = { m: THREE.Mesh; orig: THREE.Material | THREE.Material[]; clone: THREE.Material[] };
    type Layer = { objects: THREE.Object3D[]; compiling: number; fades: Fade[]; shownAt: number | null; fading: boolean };
    const layers: Layer[] = [];
    const layerAt = (d: number) => (layers[d] ??= { objects: [], compiling: 0, fades: [], shownAt: null, fading: false });
    const restore = (f: Fade) => {
        if (f.m.material === f.clone || (Array.isArray(f.m.material) && f.m.material[0] === f.clone[0])) f.m.material = f.orig;
        f.clone.forEach(c => c.dispose());
    };
    const setOpacity = (f: Fade, k: number) => {
        const origs = Array.isArray(f.orig) ? f.orig : [f.orig];
        f.clone.forEach((c, i) => { c.opacity = origs[i].opacity * k; });
    };
    let seen = 0;
    let cursor = 0;
    let lastShownAt = -Infinity;
    return {
        play: (t) => {
            while (seen < plan.objects.length) {
                const o = plan.objects[seen++];
                const l = layerAt(Math.max(0, linkDepth(o) - 1));
                l.objects.push(o);
                l.compiling++;
                // KHR_parallel_shader_compile: drawing an uncompiled mesh would block the frame.
                gl.compileAsync(o, camera, scene).then(() => {
                    if (l.shownAt !== null) return; // straggler for a layer already shown: no fade
                    o.traverse(c => {
                        const m = c as THREE.Mesh;
                        if (!m.isMesh) return;
                        const origs = Array.isArray(m.material) ? m.material : [m.material];
                        const clone = origs.map(x => Object.assign(x.clone(), { transparent: true, opacity: 0 }));
                        l.fades.push({ m, orig: m.material, clone });
                        m.material = Array.isArray(m.material) ? clone : clone[0];
                    });
                    return gl.compileAsync(o, camera, scene);
                }).finally(() => {
                    l.compiling--;
                    if (l.shownAt !== null) o.visible = true;
                });
            }
            const last = Math.max(plan.maxDepth ?? 0, layers.length - 1);
            while (cursor <= last && t - lastShownAt >= step(cursor)) {
                const l = layers[cursor];
                const expected = plan.expected?.[cursor] ?? 0;
                if (!l) {
                    if (expected > 0 && !plan.loaded) break;
                    cursor++; // no meshes at this depth: skip without spending a step
                    continue;
                }
                if ((l.objects.length < expected && !plan.loaded) || l.compiling > 0) break;
                l.objects.forEach(o => { o.visible = true; });
                l.shownAt = lastShownAt = t;
                l.fading = true;
                cursor++;
            }
            let running = cursor <= last || !plan.loaded;
            for (const l of layers) {
                if (!l?.fading) continue;
                const k = (t - l.shownAt!) / FADE_MS;
                if (k >= 1) {
                    l.fading = false;
                    l.fades.forEach(restore);
                    l.fades = [];
                } else {
                    l.fades.forEach(f => setOpacity(f, 1 - (1 - k) ** 2)); // ease-out
                    running = true;
                }
            }
            return running;
        },
        finish: () => {
            plan.objects.forEach(o => { o.visible = true; });
            for (const l of layers) {
                l?.fades.forEach(restore);
                if (l) l.fades = [];
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
            Object.assign(plan, REVEAL === 'sweep' ? sweepReveal(plan, robot, scene, color) : treeReveal(plan, gl, camera, scene));
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
