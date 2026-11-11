/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// antd menus (rc-overflow) leave one open MessagePort per update, which keeps Node alive; without it they use requestAnimationFrame
delete (globalThis as { MessageChannel?: unknown }).MessageChannel;
