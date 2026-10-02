# Architecture Overview - lucy_control_panel

**UML Component (UI container)** - browser-side Control Panel only.  
**Index:** [`lucy_ws/docs/architecture/README.md`](../../../../docs/architecture/README.md)  
**System schematic** (workspace + MCU + peripherals):  
[`lucy_ws/docs/architecture/overview.md`](../../../../docs/architecture/overview.md)  
**Conventions:** [`lucy_ws/docs/architecture/GUIDE.md`](../../../../docs/architecture/GUIDE.md)

## Module map

```
src/
├── Pages/          Route-level views (React components)
├── Components/     Shared UI components
├── Services/
│   ├── ros/        ROS Bridge communication layer
│   │   ├── ros.service.ts          WebSocket lifecycle singleton
│   │   └── handlers/               Topic-specific publish/subscribe logic
│   ├── storage.service.ts          LocalStorage persistence
│   └── axiosClient.service.ts      HTTP client (REST endpoints)
├── Constants/      Static config (ROS topics, joint mappings, types)
├── hooks/          Custom React hooks
└── Utils/          Pure helpers (math, logger)
```

## UI container diagram

**UML Component (Control Panel)** - React app inside the browser; rosbridge is the external edge.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"lineColor": "#00FF41", "edgeLabelBackground": "#161b22", "clusterBorder": "#00FF41"}}}%%
flowchart TB
  subgraph browser ["Browser"]
    Pages["Pages"]
    Components["Components"]
    Hooks["useRosConnection"]
    Storage["StorageService"]
    RosBridge["RosBridgeService"]
    JSH["JointStateHandler"]
    CamH["CameraHandler"]
    CCH["ConnectedClientsHandler"]

    Pages --> Components
    Pages --> Hooks
    Pages --> Storage
    Pages --> JSH
    Pages --> CamH
    Pages --> CCH
    Hooks --> RosBridge
    JSH --> RosBridge
    CamH --> RosBridge
    CCH --> RosBridge
  end

  RosBridge -->|"WebSocket"| RosbridgeServer["rosbridge_server"]
  linkStyle default stroke:#00FF41,stroke-width:2px
```

Downstream ROS / hardware / MCU path is documented only in the
[workspace overview](../../../../docs/architecture/overview.md) - do not duplicate it here.

## Joint control data flow

**UML Sequence (joint command from UI)** - slider degrees to ROS radians.

```mermaid
sequenceDiagram
  actor User
  participant Slider as "JointControl"
  participant Panel as "RobotControlPanel"
  participant JSH as "JointStateHandler"
  participant WS as "RosBridgeService"
  participant ROS as "ros2_control"
  User->>Slider: move slider servo deg
  Slider->>Panel: onJointChange
  Panel->>Panel: servoDegToJointRad
  Panel->>JSH: publishJointStates
  JSH->>WS: JointTrajectory publish
  WS->>ROS: trajectory positions rad
  ROS-->>JSH: joint_states rad
  JSH-->>Slider: jointRadToServoDeg
```

### Units along the path

| Stage | Unit | Source |
|-------|------|--------|
| Slider native | servo degrees | UI; limits converted from rad hardware YAML |
| Wire to `ros2_control` | URDF radians | `servoDegToJointRad(...)` |
| `LucySystemHardware::write()` | URDF radians, then millirad on SHM | See ros2_control docs |
| `/joint_states` | URDF radians | `joint_state_broadcaster` |
| 3D viewer + slider readback | servo degrees | `jointRadToServoDeg(...)` |

Hardware YAML stores **radians**; the panel edits **degrees** at the UI boundary only.

## Activate / Configure workflow

`useActivateConfigureWorkflow.tsx` drives the modal in `ActivateConfigureWorkflowModal.tsx`. The pipeline mirrors the `lucy_config_pipeline` action phases:

| Step | UI | Backend phase | Skipped when |
|------|----|---------------|--------------|
| VALIDATE | always shown | `validate` | never |
| ACTIVATE | always shown | (frontend save + activation) | never |
| **GENERATE** | always shown | `generate` | never |
| BUILD | shown when not *SIMULATION ONLY* | `build` | `simulation_only` |
| FLASH | shown when not *SIMULATION ONLY* | `flash` | `simulation_only`, `build_only` |
| RELOAD | always shown | `reload` | never |

*SIMULATION ONLY* still rewrites ros2_control configuration; only firmware build/flash are skipped.
