/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useContext, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography, Grid } from 'antd';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { HardwareConfigPresetHeaderTag } from '../../Components/HardwareConfigPresetTag.tsx';
import { HardwareYamlConfigManager } from '../../Components/HardwareYamlConfigManager.tsx';
import { LucyLoader } from '../../Components/LucyLoader.tsx';
import { CustomTitle } from '../../Components/CustomTitle.tsx';
import { UNPARSED_VALIDATION_KEY, GENERAL_VALIDATION_KEY } from '../../Utils/hardwareConfigServerErrors.ts';
import { UI_CARD_SURFACE_STYLE, UI_PRIMARY_GREEN_BUTTON_STYLE } from '../../Constants/uiTheme.ts';
import { HeaderHeightContext } from '../../contexts/HeaderHeightContext.ts';
import './configuration.switch.css';
import { ActivateConfigureWorkflowModal } from './components/ActivateConfigureWorkflowModal.tsx';
import { useHardwareConfiguration } from './hooks/useHardwareConfiguration.tsx';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const UNASSIGNED_BOARD_KEY = '__unassigned__';

function omitBoardColumn<T extends { key?: string }>(columns: T[]): T[] {
    return columns.filter((col) => col.key !== 'board');
}

const ConfigurationPage = () => {
    const hw = useHardwareConfiguration();
    const editorLocked = hw.editorLocked;
    const [newBoardId, setNewBoardId] = useState('rp2040_');
    const [pcaBoardId, setPcaBoardId] = useState('');
    const [pcaAddress, setPcaAddress] = useState('0x40');
    // The page header is `position: sticky; top: 0`, so the actuator table header has to park below it.
    const headerHeight = useContext(HeaderHeightContext);
    const screens = useBreakpoint();
    const isMobile = !screens.lg;

    const actuatorColumnsNoBoard = useMemo(
        () => omitBoardColumn(hw.actuatorColumns),
        [hw.actuatorColumns],
    );
    const sensorColumnsNoBoard = useMemo(
        () => omitBoardColumn(hw.pressureSensorColumns),
        [hw.pressureSensorColumns],
    );

    const boardSections = useMemo(() => {
        const knownIds = hw.boardRows.map((b) => b.boardId);
        const known = new Set(knownIds);
        const actuatorsByBoard = new Map<string, typeof hw.actuatorRows>();
        const sensorsByBoard = new Map<string, typeof hw.pressureSensorRows>();
        const ensure = (boardId: string) => {
            if (!actuatorsByBoard.has(boardId)) actuatorsByBoard.set(boardId, []);
            if (!sensorsByBoard.has(boardId)) sensorsByBoard.set(boardId, []);
        };
        for (const id of knownIds) ensure(id);
        for (const row of hw.actuatorRows) {
            const boardId = String(row.row.board ?? '').trim();
            const key = boardId && known.has(boardId) ? boardId : UNASSIGNED_BOARD_KEY;
            ensure(key);
            actuatorsByBoard.get(key)!.push(row);
        }
        for (const row of hw.pressureSensorRows) {
            const boardId = String(row.row.board ?? '').trim();
            const key = boardId && known.has(boardId) ? boardId : UNASSIGNED_BOARD_KEY;
            ensure(key);
            sensorsByBoard.get(key)!.push(row);
        }
        const sections = knownIds.map((boardId) => ({
            boardId,
            title: boardId,
            actuators: actuatorsByBoard.get(boardId) ?? [],
            sensors: sensorsByBoard.get(boardId) ?? [],
        }));
        const orphanActs = actuatorsByBoard.get(UNASSIGNED_BOARD_KEY) ?? [];
        const orphanSensors = sensorsByBoard.get(UNASSIGNED_BOARD_KEY) ?? [];
        if (orphanActs.length > 0 || orphanSensors.length > 0) {
            sections.push({
                boardId: UNASSIGNED_BOARD_KEY,
                title: 'UNASSIGNED BOARD',
                actuators: orphanActs,
                sensors: orphanSensors,
            });
        }
        return sections;
    }, [hw.boardRows, hw.actuatorRows, hw.pressureSensorRows]);

    if (isMobile) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)', padding: 24 }}>
                <Card style={{ maxWidth: 400, textAlign: 'center', ...UI_CARD_SURFACE_STYLE }}>
                    <Title level={4}>Unsupported Screen Size</Title>
                    <Text>
                        The robot configuration page is not available on small screens. Please use a tablet or computer for a better experience.
                    </Text>
                </Card>
            </div>
        );
    }

    return (
        <>
            {hw.contextHolderMessage}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    width: '100%',
                    marginBottom: 12,
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'auto auto',
                        columnGap: 12,
                        rowGap: 6,
                        alignItems: 'center',
                        width: isMobile ? '100%' : 'auto',
                    }}
                >
                    {!isMobile && <span style={{ gridColumn: 1, gridRow: 1 }} aria-hidden />}
                    <div style={{ gridColumn: isMobile ? 1 : 2, gridRow: 1 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="loaded"
                            label="LOADED"
                            value={hw.resolvedName || ''}
                            title="Configuration YAML currently open in the editor"
                        />
                    </div>
                    <Tag
                        title="ROS package wired on lucy_config_pipeline (from config/get)"
                        style={{ gridColumn: 1, gridRow: 2, margin: 0, width: isMobile ? 'fit-content' : 'auto' }}
                    >
                        <span style={{ fontWeight: 600 }}>ROBOT PACKAGE:</span> {hw.serverRobotPackage || '—'}
                    </Tag>
                    <div style={{ gridColumn: isMobile ? 1 : 2, gridRow: isMobile ? 3 : 2 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="active"
                            label="ACTIVE"
                            value={hw.serverActiveConfigName || ''}
                            title="Current active hardware configuration from config/list"
                        />
                    </div>
                    {!isMobile && <span style={{ gridColumn: 1, gridRow: 3 }} aria-hidden />}
                    <div style={{ gridColumn: isMobile ? 1 : 2, gridRow: isMobile ? 4 : 3 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="flashed"
                            label="FLASHED"
                            value={hw.serverFlashedConfigName || ''}
                            title={
                                hw.serverFlashedAt
                                    ? `Last successful pipeline flash (UTC): ${hw.serverFlashedAt}`
                                    : 'Preset last written to boards via configure_pipeline flash (from active_meta / config/get)'
                            }
                        />
                    </div>
                </div>
                <Space wrap align="center" style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <Button
                        icon={<ReloadOutlined />}
                        disabled={!hw.loadedSnapshot || editorLocked}
                        onClick={hw.handleRevert}
                    >
                        REVERT
                    </Button>
                    <HardwareYamlConfigManager
                        isConnected={hw.isConnected}
                        yamlDoc={hw.yamlDoc}
                        isDirty={hw.isDirty}
                        saving={hw.saving}
                        loadingConfig={hw.loading}
                        hardwareRobotName={hw.hardwareRobotName}
                        actuatorCount={hw.actuatorRows.length}
                        sensorPressureCount={hw.pressureSensorRows.length}
                        savedConfigNames={hw.savedConfigNames}
                        activeConfigName={hw.serverActiveConfigName}
                        flashedConfigName={hw.serverFlashedConfigName}
                        configListLoading={hw.configListLoading}
                        toolbarTargetConfig={hw.loadConfigName}
                        onToolbarTargetConfigChange={hw.setLoadConfigName}
                        onRefreshConfigList={hw.refreshConfigListForModal}
                        onSaveConfig={hw.saveConfigByName}
                        onLoadConfig={(name) => hw.loadHardwareConfig(name, { successToast: false })}
                        deleteConfigByName={hw.deleteConfigByName}
                        deletingConfig={hw.deleting}
                        workflowLocked={editorLocked}
                    />
                    {hw.isDirty ? <Tag color="orange">UNSAVED EDITS</Tag> : null}
                </Space>
                <Space wrap align="center" style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <HardwareConfigPresetHeaderTag
                        variant="target"
                        label="TARGET"
                        value={hw.selectedTargetConfigName || ''}
                    />
                    <Tooltip title="Activate & configure the TARGET preset on the robot">
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            loading={hw.workflowRunning}
                            onClick={hw.openActivateModal}
                            style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                        >
                            ACTIVATE
                        </Button>
                    </Tooltip>
                </Space>
            </div>

            {!hw.yamlDoc ? (
                <LucyLoader
                    label={hw.loading ? 'LOADING ROBOT CONFIGURATION' : 'WAITING FOR ROS BRIDGE'}
                    connectButton={!hw.loading}
                    detail={
                        hw.loading
                            ? 'Fetching the active hardware preset and joint catalog.'
                            : 'Use Quick Connect in the header — the configuration loads automatically once linked.'
                    }
                />
            ) : null}

            {hw.serverErrorRows.length > 0 ? (
                <Alert
                    type="error"
                    style={{ marginBottom: 12 }}
                    message="SYSTEM VALIDATION (FROM CONFIG/SAVE)"
                    description={
                        <div style={{ maxHeight: 220, overflow: 'auto' }}>
                            <ul style={{ marginBottom: 8, paddingLeft: 18 }}>
                                {hw.serverErrorRows.map((row, i) => (
                                    <li key={`${row.field}-${i}`}>
                                        {row.field === UNPARSED_VALIDATION_KEY ? (
                                            <Text code>raw</Text>
                                        ) : row.field === GENERAL_VALIDATION_KEY ? (
                                            <Text code>general</Text>
                                        ) : (
                                            <Text code>{row.field}</Text>
                                        )}
                                        : {row.message}
                                    </li>
                                ))}
                            </ul>
                            {hw.lastValidationLines.length > 0 ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    BACKEND RETURNED {hw.lastValidationLines.length} LINE(S); STRUCTURED ROWS PARSE JSON METADATA WHERE
                                    PRESENT.
                                </Text>
                            ) : null}
                        </div>
                    }
                    showIcon
                />
            ) : null}

            {hw.urdfWarnings.length > 0 ? (
                <Alert
                    type="warning"
                    style={{ marginBottom: 12 }}
                    message="URDF CROSS-CHECK WARNINGS (SAVED ANYWAY IF SUCCESS)"
                    description={
                        <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                            {hw.urdfWarnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    }
                    showIcon
                />
            ) : null}

            <ActivateConfigureWorkflowModal
                open={hw.activateModalOpen}
                onClose={hw.closeActivateModal}
                isDirty={hw.isDirty}
                selectedTargetConfigName={hw.selectedTargetConfigName}
                serverActiveConfigName={hw.serverActiveConfigName}
                serverRobotPackage={hw.serverRobotPackage}
                pipelineBoardOptions={hw.pipelineBoardOptions}
                activateModalBoards={hw.activateModalBoards}
                onActivateModalBoardsChange={hw.setActivateModalBoards}
                activateModalBuildOnly={hw.activateModalBuildOnly}
                onActivateModalBuildOnlyChange={hw.setActivateModalBuildOnly}
                activateModalActivateOnly={hw.activateModalActivateOnly}
                onActivateModalActivateOnlyChange={hw.setActivateModalActivateOnly}
                activateModalSimulationOnly={hw.activateModalSimulationOnly}
                onActivateModalSimulationOnlyChange={hw.setActivateModalSimulationOnly}
                onRun={hw.runWorkflowFromModal}
                onAbort={hw.abortWorkflow}
                workflowRunning={hw.workflowRunning}
                workflowSteps={hw.workflowSteps}
                workflowOverallPercent={hw.workflowOverallPercent}
                workflowLogLines={hw.workflowLogLines}
                workflowLastRunSucceeded={hw.workflowLastRunSucceeded}
                workflowLastRunDiff={hw.workflowLastRunDiff}
                gazeboRunning={hw.gazeboRunning}
                canRun={hw.modalCanRun && hw.isConnected}
                runBlockedReason={hw.modalRunBlockedReason}
                pendingEnableConfirm={hw.pendingEnableConfirm}
                runPreparing={hw.runPreparing}
                onConfirmPendingEnable={hw.confirmPendingEnableAndRun}
                onCancelPendingEnable={hw.cancelPendingEnableConfirm}
                generatedFileNames={hw.generatedFileNames}
            />

            {hw.yamlDoc ? (
                <div
                    style={
                        editorLocked
                            ? { pointerEvents: 'none', opacity: 0.55, transition: 'opacity 0.2s ease' }
                            : undefined
                    }
                >
                    <Card
                        title={<CustomTitle title="BOARDS" subtitle="SERIAL AND ATTACHMENTS" level={4} />}
                        size="small"
                        style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}
                        extra={
                            <Space>
                                <Input
                                    size="small"
                                    value={newBoardId}
                                    aria-label="new board id"
                                    onChange={(event) => setNewBoardId(event.target.value)}
                                    style={{ width: 180 }}
                                />
                                <Button
                                    size="small"
                                    disabled={editorLocked || !hw.yamlDoc}
                                    onClick={() => hw.handleAddBoard(newBoardId)}
                                >
                                    Add board
                                </Button>
                            </Space>
                        }
                    >
                        <Table size="small" dataSource={hw.boardRows} columns={hw.boardColumns} pagination={false} scroll={{ x: 'max-content' }} />
                        <Space style={{ marginTop: 8 }}>
                            <Input
                                size="small"
                                value={pcaBoardId}
                                aria-label="pca board id"
                                placeholder="rp2040_left_arm"
                                onChange={(event) => setPcaBoardId(event.target.value)}
                                style={{ width: 180 }}
                            />
                            <Input
                                size="small"
                                value={pcaAddress}
                                aria-label="pca address"
                                onChange={(event) => setPcaAddress(event.target.value)}
                                style={{ width: 90 }}
                            />
                            <Button
                                size="small"
                                disabled={editorLocked || !hw.yamlDoc}
                                onClick={() => hw.handleAttachPca(pcaBoardId, pcaAddress)}
                            >
                                Attach PCA9685
                            </Button>
                        </Space>
                    </Card>

                    <Card
                        title={
                            <CustomTitle
                                title="ACTUATORS & SENSORS"
                                subtitle="SPLIT BY BOARD"
                                level={4}
                            />
                        }
                        size="small"
                        style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}
                        extra={
                            <Input.Search
                                placeholder="Search actuators (id, name, joint, board)"
                                value={hw.actuatorSearchQuery}
                                onChange={(e) => hw.setActuatorSearchQuery(e.target.value)}
                                style={{ width: isMobile ? '100%' : 280 }}
                                allowClear
                            />
                        }
                    >
                        {boardSections.map((section) => {
                            const canAddActuator =
                                section.boardId !== UNASSIGNED_BOARD_KEY &&
                                hw.boardsEligibleForNewActuator.includes(section.boardId);
                            const sensorActuatorOptions = hw.actuatorsEligibleForNewPressureSensor.filter(
                                (opt) =>
                                    section.boardId !== UNASSIGNED_BOARD_KEY &&
                                    opt.label.endsWith(`(${section.boardId})`),
                            );
                            const selectedSensorActuatorOk = sensorActuatorOptions.some(
                                (opt) => opt.value === hw.addPressureSensorActuatorId,
                            );
                            return (
                                <Card
                                    key={section.boardId}
                                    type="inner"
                                    size="small"
                                    style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}
                                    title={
                                        <Space wrap size={8}>
                                            <Text strong style={{ fontSize: 13 }}>
                                                {section.title}
                                            </Text>
                                            <Tag style={{ margin: 0 }}>
                                                {section.actuators.length} ACT
                                            </Tag>
                                            <Tag style={{ margin: 0 }}>
                                                {section.sensors.length} SNS
                                            </Tag>
                                        </Space>
                                    }
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            ACTUATORS
                                        </Text>
                                        {section.boardId !== UNASSIGNED_BOARD_KEY ? (
                                            <Button
                                                type="default"
                                                size="small"
                                                className="hardware-config-add-btn"
                                                disabled={editorLocked || !hw.yamlDoc || !canAddActuator}
                                                onClick={() => hw.handleAddActuator(section.boardId)}
                                                style={{ minWidth: 132 }}
                                                title={
                                                    canAddActuator
                                                        ? `Add an actuator on ${section.boardId}`
                                                        : 'No free header or PCA channel on this board.'
                                                }
                                            >
                                                <Space size={6}>
                                                    <PlusOutlined />
                                                    <span>ADD ACTUATOR</span>
                                                </Space>
                                            </Button>
                                        ) : null}
                                    </div>
                                    <Table
                                        size="small"
                                        scroll={{ x: 'max-content' }}
                                        sticky={
                                            section.boardId === boardSections[0]?.boardId
                                                ? { offsetHeader: headerHeight }
                                                : undefined
                                        }
                                        pagination={false}
                                        locale={{ emptyText: 'No actuators on this board' }}
                                        dataSource={section.actuators}
                                        columns={actuatorColumnsNoBoard}
                                    />

                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            marginTop: 16,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            FINGER PRESSURE SENSORS
                                        </Text>
                                        {section.boardId !== UNASSIGNED_BOARD_KEY ? (
                                            <Space wrap size="small">
                                                <Select
                                                    size="small"
                                                    placeholder="ACTUATOR TO ATTACH"
                                                    style={{ minWidth: isMobile ? 160 : 220 }}
                                                    showSearch
                                                    optionFilterProp="label"
                                                    disabled={
                                                        editorLocked ||
                                                        !hw.yamlDoc ||
                                                        sensorActuatorOptions.length === 0
                                                    }
                                                    value={
                                                        selectedSensorActuatorOk
                                                            ? hw.addPressureSensorActuatorId
                                                            : undefined
                                                    }
                                                    allowClear
                                                    options={sensorActuatorOptions}
                                                    onChange={(v) => hw.setAddPressureSensorActuatorId(v)}
                                                />
                                                <Button
                                                    type="default"
                                                    size="small"
                                                    className="hardware-config-add-btn"
                                                    disabled={
                                                        editorLocked ||
                                                        !hw.yamlDoc ||
                                                        !selectedSensorActuatorOk ||
                                                        !hw.addPressureSensorActuatorId
                                                    }
                                                    onClick={hw.handleAddPressureSensor}
                                                    style={{ minWidth: 118 }}
                                                    title={
                                                        sensorActuatorOptions.length === 0
                                                            ? 'No actuator on this board with a free pin.'
                                                            : 'Add a pressure sensor linked to the selected actuator.'
                                                    }
                                                >
                                                    <Space size={6}>
                                                        <PlusOutlined />
                                                        <span>ADD SENSOR</span>
                                                    </Space>
                                                </Button>
                                            </Space>
                                        ) : null}
                                    </div>
                                    <Table
                                        size="small"
                                        scroll={{ x: 'max-content' }}
                                        pagination={false}
                                        locale={{ emptyText: 'No pressure sensors on this board' }}
                                        dataSource={section.sensors}
                                        columns={sensorColumnsNoBoard}
                                    />
                                </Card>
                            );
                        })}
                    </Card>
                </div>
            ) : null}
        </>
    );
};

export default ConfigurationPage;
