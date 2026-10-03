# Lucy Control Panel - Documentation

Technical reference for the Lucy Control Panel frontend application.

---

## Navigation

### Architecture

| Document | Description |
|---|---|
| [UI architecture](./architecture/overview.md) | Control Panel module map and UI-container diagrams |
| [Architecture index](../../../docs/architecture/README.md) | Schematics index + conventions guide |
| [System overview](../../../docs/architecture/overview.md) | Full Lucy schematic (packages, MCU, peripherals) |

### Services

| Document | Description |
|---|---|
| [RosBridgeService](./services/ros/ros.service.md) | WebSocket connection lifecycle, status events |
| [JointStateHandler](./services/ros/handlers/JointState.handler.md) | Joint command publication via `trajectory_msgs/JointTrajectory` |

### [Components](./components/README.md)
Shared UI components reference table.

### [Pages](./pages/README.md)
Route-level views and their responsibilities.

---

## Conventions

- Each module doc follows the template: **Purpose → API → Data flow → Dependencies → Notes**.
- Architecture schematics follow the workspace [GUIDE](../../../docs/architecture/GUIDE.md) (UML caption + Mermaid).
- Code snippets use TypeScript.
- ROS topic names and message types are written in `monospace`.
