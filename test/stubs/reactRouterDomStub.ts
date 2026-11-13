/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Stands in for react-router-dom for static-rendering tests: the wizard only calls
 * useNavigate() to navigate away from event handlers, which this harness never
 * triggers (no real DOM events), so a no-op navigate function is enough.
 */
export function useNavigate(): (path: string) => void {
    return () => {};
}
