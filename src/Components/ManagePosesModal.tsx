/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Divider,
    Empty,
    Input,
    InputNumber,
    List,
    Modal,
    Pagination,
    Popconfirm,
    Space,
    Tag,
    Tooltip,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    DownOutlined,
    EditOutlined,
    FolderOpenOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    SaveOutlined,
    SettingOutlined,
    UpOutlined,
} from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import {
    PoseInUseError,
    storageService,
    type SavedAnimation,
    type SavedPose,
} from '../Services/storage.service.ts';
import { MovableModal } from './MovableModal';
import { ToggleSwitch } from './ToggleSwitch';
import { CustomTitle } from './CustomTitle';
import { CONTROL_OFF_HINT, ReadOnlyHint } from './ControlPage/ReadOnlyHint.tsx';

const { Text } = Typography;

interface ManagePosesModalProps {
    joints: JointControlState[];
    onLoadPose: (joints: Record<string, number>) => void;
    onPlayAnimation: (animation: SavedAnimation) => void;
    controlEnabled: boolean;
    isAnimating: boolean;
    onStopAnimation: () => void;
    isVisible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
    showTrigger?: boolean;
}

const formatDate = (value: number | string) => new Date(value).toLocaleString();

export const ManagePosesModal: React.FC<ManagePosesModalProps> = ({
    joints,
    onLoadPose,
    onPlayAnimation,
    controlEnabled,
    isAnimating,
    onStopAnimation,
    isVisible: controlledVisible,
    onVisibleChange,
    showTrigger = true,
}) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const visible = controlledVisible ?? internalVisible;
    const setVisible = (nextVisible: boolean) => {
        setInternalVisible(nextVisible);
        onVisibleChange?.(nextVisible);
    };
    const [poseName, setPoseName] = useState('');
    const [poses, setPoses] = useState<SavedPose[]>([]);
    const [poseSearch, setPoseSearch] = useState('');
    const [posePage, setPosePage] = useState(1);
    const [poseNames, setPoseNames] = useState<Record<string, string>>({});
    const [animations, setAnimations] = useState<SavedAnimation[]>([]);
    const [animationSearch, setAnimationSearch] = useState('');
    const [animationPage, setAnimationPage] = useState(1);
    const [editorOpen, setEditorOpen] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const [selectedAnimationId, setSelectedAnimationId] = useState<string | null>(null);
    const [animationName, setAnimationName] = useState('');
    const [sequence, setSequence] = useState<string[]>([]);
    const [speed, setSpeed] = useState(1);
    const [loop, setLoop] = useState(true);
    const [loopCount, setLoopCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const filteredPoses = useMemo(() => {
        const query = poseSearch.trim().toLocaleLowerCase();
        if (!query) return poses;
        return poses.filter(pose => (poseNames[pose.id] ?? pose.name).toLocaleLowerCase().includes(query));
    }, [poseNames, poseSearch, poses]);
    const paginatedPoses = filteredPoses.slice((posePage - 1) * 5, posePage * 5);

    const canCreateAnimation = poses.length >= 2;

    const filteredAnimations = useMemo(() => {
        const query = animationSearch.trim().toLocaleLowerCase();
        if (!query) return animations;
        return animations.filter(animation => animation.name.toLocaleLowerCase().includes(query));
    }, [animationSearch, animations]);
    const paginatedAnimations = filteredAnimations.slice((animationPage - 1) * 5, animationPage * 5);

    const animationsByPoseId = useMemo(() => {
        const map: Record<string, string[]> = {};
        animations.forEach(animation => {
            new Set(animation.poseIds).forEach(poseId => {
                (map[poseId] ??= []).push(animation.name);
            });
        });
        return map;
    }, [animations]);

    const loadData = useCallback(async () => {
        const [loadedPoses, loadedAnimations] = await Promise.all([
            storageService.loadPoses(),
            storageService.loadAnimations(),
        ]);
        setPoses(loadedPoses);
        setPoseNames(Object.fromEntries(loadedPoses.map(pose => [pose.id, pose.name])));
        setAnimations(loadedAnimations);
    }, []);

    useEffect(() => {
        if (visible) void loadData();
    }, [loadData, visible]);

    useEffect(() => {
        setPosePage(1);
    }, [poseSearch]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(filteredPoses.length / 5));
        setPosePage(current => Math.min(current, pageCount));
    }, [filteredPoses.length]);

    useEffect(() => {
        setAnimationPage(1);
    }, [animationSearch]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(filteredAnimations.length / 5));
        setAnimationPage(current => Math.min(current, pageCount));
    }, [filteredAnimations.length]);

    // Hides the animations editor if less than 2 poses available
    useEffect(() => {
        if (poses.length < 2) setEditorOpen(false);
    }, [poses.length]);

    // Autoscrolls to the animations editor when it opens (or when switching to another animation)
    useEffect(() => {
        if (!editorOpen) return;
        const timer = window.setTimeout(() => {
            editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return () => window.clearTimeout(timer);
    }, [editorOpen, selectedAnimationId]);

    const resetAnimationEditor = () => {
        setSelectedAnimationId(null);
        setAnimationName('');
        setSequence([]);
        setSpeed(1);
        setLoop(true);
        setLoopCount(0);
    };

    const closeAnimationEditor = () => {
        resetAnimationEditor();
        setEditorOpen(false);
    };

    const startNewAnimation = () => {
        resetAnimationEditor();
        setEditorOpen(true);
    };

    const editAnimation = (animation: SavedAnimation) => {
        setSelectedAnimationId(animation.id);
        setAnimationName(animation.name);
        setSequence(animation.poseIds);
        setSpeed(animation.speed);
        setLoop(animation.loop);
        setLoopCount(animation.loopCount ?? 0);
        setEditorOpen(true);
    };

    const handlePlayAnimation = (animation: SavedAnimation) => {
        if (!controlEnabled) {
            message.info(CONTROL_OFF_HINT);
            return;
        }
        onPlayAnimation(animation);
    };

    const handleSavePose = async () => {
        if (isAnimating) {
            message.info('Stop the animation before saving a pose');
            return;
        }
        if (!poseName.trim()) {
            message.warning('Please enter a pose name');
            return;
        }
        setLoading(true);
        try {
            await storageService.savePose(poseName.trim(), joints);
            setPoseName('');
            await loadData();
            message.success('Pose saved');
        } catch (error) {
            message.error('Failed to save pose');
            console.error('Error saving pose:', error);
        } finally {
            setLoading(false);
        }
    };

    const readOnlyReason = controlEnabled ? undefined : CONTROL_OFF_HINT;

    const handleLoadPose = async (id: string) => {
        if (!controlEnabled) {
            message.info(CONTROL_OFF_HINT);
            return;
        }
        setLoading(true);
        try {
            if (isAnimating) onStopAnimation();
            const pose = await storageService.loadPose(id);
            if (!pose) {
                message.error('Pose not found');
                return;
            }
            onLoadPose(pose.joints);
            message.success(`Pose "${pose.name}" loaded`);
        } catch (error) {
            message.error('Failed to load pose');
            console.error('Error loading pose:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRenamePose = async (id: string) => {
        const name = poseNames[id] ?? '';
        const pose = poses.find(item => item.id === id);
        if (!pose || name.trim() === pose.name) return;
        if (!name.trim()) {
            setPoseNames(current => ({ ...current, [id]: pose.name }));
            message.warning('Please enter a pose name');
            return;
        }

        try {
            const renamedPose = await storageService.renamePose(id, name);
            setPoses(current => current.map(item => item.id === id ? renamedPose : item));
            setPoseNames(current => ({ ...current, [id]: renamedPose.name }));
            if (renamedPose.name !== name.trim()) {
                message.info(`Pose renamed to "${renamedPose.name}" to avoid a duplicate name`);
            }
        } catch (error) {
            message.error('Failed to rename pose');
            console.error('Error renaming pose:', error);
            setPoseNames(current => ({ ...current, [id]: pose.name }));
        }
    };

    const deletePose = async (id: string, name: string, force = false) => {
        try {
            await storageService.deletePose(id, force);
            await loadData();
            message.success(force ? `Pose "${name}" and linked animations deleted` : `Pose "${name}" deleted`);
        } catch (error) {
            if (error instanceof PoseInUseError) {
                Modal.confirm({
                    title: 'Pose is used by an animation',
                    content: (
                        <div>
                            <p>This pose is linked to:</p>
                            <ul>{error.animationNames.map(animation => <li key={animation}>{animation}</li>)}</ul>
                            <p>Delete the pose and those animations?</p>
                        </div>
                    ),
                    okText: 'Delete all',
                    okType: 'danger',
                    onOk: () => deletePose(id, name, true),
                });
            } else {
                message.error('Failed to delete pose');
                console.error('Error deleting pose:', error);
            }
        }
    };

    const renderDeleteAction = (pose: SavedPose) => {
        const linkedAnimations = animationsByPoseId[pose.id] ?? [];

        if (linkedAnimations.length > 0) {
            return (
                <Tooltip
                    key="delete"
                    title={`Can't delete: used by ${linkedAnimations.map(name => `"${name}"`).join(', ')}. Remove it from the animation(s) first.`}
                >
                    <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
                        <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            disabled
                            aria-label={`Cannot delete pose ${pose.name}: used by an animation`}
                        />
                    </span>
                </Tooltip>
            );
        }

        return (
            <Popconfirm
                key="delete"
                title={`Delete "${pose.name}"?`}
                onConfirm={() => void deletePose(pose.id, pose.name)}
                okButtonProps={{ danger: true }}
            >
                <Button danger type="text" icon={<DeleteOutlined />} aria-label={`Delete pose ${pose.name}`} />
            </Popconfirm>
        );
    };

    const addPoseToSequence = (id: string) => {
        if (sequence.at(-1) === id) {
            message.warning('The same pose cannot be chained twice in a row');
            return;
        }
        setSequence(current => [...current, id]);
    };

    const movePoseInSequence = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sequence.length) return;
        const next = [...sequence];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        if (next.some((id, itemIndex) => itemIndex > 0 && id === next[itemIndex - 1])) {
            message.warning('The same pose cannot be chained twice in a row');
            return;
        }
        setSequence(next);
    };

    const saveAnimation = async () => {
        if (!animationName.trim()) {
            message.warning('Please enter an animation name');
            return;
        }
        if (sequence.length < 2) {
            message.warning('An animation requires at least two poses');
            return;
        }
        setLoading(true);
        try {
            await storageService.saveAnimation({
                id: selectedAnimationId ?? undefined,
                name: animationName.trim(),
                poseIds: sequence,
                speed,
                loop,
                loopCount: loop ? loopCount : 0,
            });
            await loadData();
            closeAnimationEditor();
            message.success(selectedAnimationId ? 'Animation updated' : 'Animation created');
        } catch (error) {
            message.error('Failed to save animation');
            console.error('Error saving animation:', error);
        } finally {
            setLoading(false);
        }
    };

    const animationValidationError = !animationName.trim()
        ? 'Enter an animation name'
        : sequence.length < 2
            ? 'Add at least two frames'
            : null;

    const deleteAnimation = async (id: string, name: string) => {
        try {
            await storageService.deleteAnimation(id);
            await loadData();
            if (id === selectedAnimationId) closeAnimationEditor();
            message.success(`Animation "${name}" deleted`);
        } catch (error) {
            message.error('Failed to delete animation');
            console.error('Error deleting animation:', error);
        }
    };

    return (
        <>
            {showTrigger && (
                <Button
                    icon={<SettingOutlined />}
                    onClick={() => setVisible(true)}
                    style={{
                        backgroundColor: UI_COLOR_TRANSPARENT,
                        borderColor: UI_BORDER_SOFT,
                        color: UI_TEXT_PRIMARY_ON_DARK,
                    }}
                >
                    MANAGE POSES {poses.length > 0 && <span style={{ color: UI_ACCENT_GREEN }}>({poses.length})</span>}
                </Button>
            )}
            <MovableModal
                modalName="MANAGE POSES"
                isVisible={visible}
                onClose={() => setVisible(false)}
                initialPosition={{ x: 120, y: 100 }}
                initialSize={{ w: 720, h: 500 }}
                header={<SettingOutlined style={{ color: UI_ACCENT_GREEN }} />}
                footer={<Button onClick={() => setVisible(false)}>CLOSE</Button>}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <section>
                        <CustomTitle title="SAVE POSE" level={4} style={{ marginBottom: 12 }} />
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={poseName}
                                maxLength={50}
                                placeholder="Pose name"
                                onChange={event => setPoseName(event.target.value)}
                                onPressEnter={() => void handleSavePose()}
                                style={{ backgroundColor: UI_INPUT_SURFACE, color: UI_TEXT_PRIMARY_ON_DARK }}
                            />
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={loading}
                                disabled={isAnimating || !poseName.trim()}
                                onClick={() => void handleSavePose()}
                                style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                            >
                                SAVE POSE
                            </Button>
                        </Space.Compact>
                        <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>{joints.length} joints will be stored with the pose.</Text>
                    </section>

                    <Divider style={{ borderColor: UI_BORDER_MUTED, margin: 0 }} />

                    <section>
                        <CustomTitle title="LOAD POSE" level={4} style={{ marginBottom: 12 }} />
                        {poses.length === 0 ? <Empty description="No saved poses yet" /> : (
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Input.Search
                                    value={poseSearch}
                                    allowClear
                                    placeholder="Search saved poses"
                                    onChange={event => setPoseSearch(event.target.value)}
                                />
                                {filteredPoses.length === 0 ? <Empty description="No matching poses" /> : (
                                    <>
                                        <List
                                            dataSource={paginatedPoses}
                                            renderItem={pose => (
                                                <List.Item
                                                    style={{ backgroundColor: UI_LIST_ROW_BG, border: `1px solid ${UI_BORDER_MUTED}`, padding: 12 }}
                                                    actions={[
                                                        <ReadOnlyHint key="load" reason={readOnlyReason}>
                                                            <Button
                                                                type="primary"
                                                                icon={<FolderOpenOutlined />}
                                                                loading={loading}
                                                                disabled={!controlEnabled}
                                                                onClick={() => void handleLoadPose(pose.id)}
                                                                style={controlEnabled
                                                                    ? { ...UI_PRIMARY_GREEN_BUTTON_STYLE, color: UI_TEXT_ON_ACCENT }
                                                                    : undefined}
                                                            >
                                                                LOAD
                                                            </Button>
                                                        </ReadOnlyHint>,
                                                        renderDeleteAction(pose),
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        title={(
                                                            <Input
                                                                value={poseNames[pose.id] ?? pose.name}
                                                                maxLength={50}
                                                                onChange={event => setPoseNames(current => ({ ...current, [pose.id]: event.target.value }))}
                                                                onBlur={() => void handleRenamePose(pose.id)}
                                                                onPressEnter={event => {
                                                                    event.currentTarget.blur();
                                                                }}
                                                                aria-label={`Rename pose ${pose.name}`}
                                                            />
                                                        )}
                                                        description={<Text style={{ color: UI_TEXT_SUBTLE }}>{formatDate(pose.date ?? pose.timestamp)} - {Object.keys(pose.joints).length} joints</Text>}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                        <Pagination
                                            current={posePage}
                                            pageSize={5}
                                            total={filteredPoses.length}
                                            showSizeChanger={false}
                                            onChange={setPosePage}
                                            hideOnSinglePage
                                        />
                                    </>
                                )}
                            </Space>
                        )}
                    </section>

                    <Divider style={{ borderColor: UI_BORDER_MUTED, margin: 0 }} />

                    <section>
                        <CustomTitle title="ANIMATIONS" level={4} style={{ marginBottom: 12 }} />
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Tooltip
                                placement="bottomLeft"
                                title={canCreateAnimation ? undefined : 'Save at least two poses to create an animation.'}
                            >
                                <span style={{ display: 'inline-block', cursor: canCreateAnimation ? undefined : 'not-allowed' }}>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        disabled={!canCreateAnimation || (editorOpen && selectedAnimationId === null)}
                                        onClick={startNewAnimation}
                                        style={canCreateAnimation ? UI_PRIMARY_GREEN_BUTTON_STYLE : undefined}
                                    >
                                        CREATE ANIMATION
                                    </Button>
                                </span>
                            </Tooltip>

                            {animations.length > 0 && (
                                <>
                                    <Input.Search
                                        value={animationSearch}
                                        allowClear
                                        placeholder="Search saved animations"
                                        onChange={event => setAnimationSearch(event.target.value)}
                                    />
                                    {filteredAnimations.length === 0 ? <Empty description="No matching animations" /> : (
                                        <>
                                            <List
                                                dataSource={paginatedAnimations}
                                                renderItem={animation => (
                                                    <List.Item
                                                        style={{ backgroundColor: UI_LIST_ROW_BG, border: `1px solid ${UI_BORDER_MUTED}`, padding: 12 }}
                                                        actions={[
                                                            <ReadOnlyHint key="play" reason={readOnlyReason}>
                                                                <Button
                                                                    type="primary"
                                                                    icon={<PlayCircleOutlined />}
                                                                    disabled={!controlEnabled}
                                                                    onClick={() => handlePlayAnimation(animation)}
                                                                    style={controlEnabled
                                                                        ? { ...UI_PRIMARY_GREEN_BUTTON_STYLE, color: UI_TEXT_ON_ACCENT }
                                                                        : undefined}
                                                                >
                                                                    PLAY
                                                                </Button>
                                                            </ReadOnlyHint>,
                                                            <Tooltip key="edit" title="Edit animation">
                                                                <Button
                                                                    type="text"
                                                                    icon={<EditOutlined />}
                                                                    onClick={() => editAnimation(animation)}
                                                                    aria-label={`Edit animation ${animation.name}`}
                                                                />
                                                            </Tooltip>,
                                                            <Popconfirm
                                                                key="delete"
                                                                title={`Delete "${animation.name}"?`}
                                                                onConfirm={() => void deleteAnimation(animation.id, animation.name)}
                                                                okButtonProps={{ danger: true }}
                                                            >
                                                                <Button danger type="text" icon={<DeleteOutlined />} aria-label={`Delete animation ${animation.name}`} />
                                                            </Popconfirm>,
                                                        ]}
                                                    >
                                                        <List.Item.Meta
                                                            title={<Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>{animation.name}</Text>}
                                                            description={(
                                                                <Text style={{ color: UI_TEXT_SUBTLE }}>
                                                                    {animation.poseIds.length} poses - {animation.speed}x -{' '}
                                                                    {animation.loop
                                                                        ? (animation.loopCount ? `${animation.loopCount} loops` : 'loops forever')
                                                                        : 'plays once'}
                                                                </Text>
                                                            )}
                                                        />
                                                    </List.Item>
                                                )}
                                            />
                                            <Pagination
                                                current={animationPage}
                                                pageSize={5}
                                                total={filteredAnimations.length}
                                                showSizeChanger={false}
                                                onChange={setAnimationPage}
                                                hideOnSinglePage
                                            />
                                        </>
                                    )}
                                </>
                            )}

                            {editorOpen && canCreateAnimation && (
                                <div ref={editorRef} style={{ scrollMarginTop: 8 }}>
                                    <Divider style={{ borderColor: UI_BORDER_MUTED, margin: '0 0 12px' }} />
                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                        <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                                            {selectedAnimationId ? 'EDIT ANIMATION' : 'NEW ANIMATION'}
                                        </Text>
                                        <Input
                                            value={animationName}
                                            placeholder="Animation name"
                                            onChange={event => setAnimationName(event.target.value)}
                                        />
                                        <div>
                                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Pose sequence</Text>
                                            <List
                                                size="small"
                                                dataSource={sequence}
                                                locale={{ emptyText: 'Add poses below to build the sequence' }}
                                                renderItem={(id, index) => {
                                                    const pose = poses.find(item => item.id === id);
                                                    return (
                                                        <List.Item
                                                            actions={[
                                                                <Tooltip title="Move up" key="up"><Button type="text" icon={<UpOutlined />} disabled={index === 0} onClick={() => movePoseInSequence(index, -1)} /></Tooltip>,
                                                                <Tooltip title="Move down" key="down"><Button type="text" icon={<DownOutlined />} disabled={index === sequence.length - 1} onClick={() => movePoseInSequence(index, 1)} /></Tooltip>,
                                                                <Button type="text" danger icon={<DeleteOutlined />} key="remove" onClick={() => setSequence(current => current.filter((_, itemIndex) => itemIndex !== index))} />,
                                                            ]}
                                                        >
                                                            <Tag color="green">{index + 1}</Tag>
                                                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>{pose?.name ?? 'Missing pose'}</Text>
                                                        </List.Item>
                                                    );
                                                }}
                                            />
                                            <Space wrap style={{ marginTop: 8 }}>
                                                {poses.map(pose => (
                                                    <Tooltip
                                                        key={pose.id}
                                                        title={sequence.at(-1) === pose.id ? 'Blocked: the same pose cannot be put twice in a row' : 'Add pose to sequence'}
                                                    >
                                                        <span>
                                                            <Button
                                                                size="small"
                                                                icon={<PlusOutlined />}
                                                                disabled={sequence.at(-1) === pose.id}
                                                                onClick={() => addPoseToSequence(pose.id)}
                                                                style={sequence.at(-1) === pose.id ? { color: UI_TEXT_SUBTLE, borderColor: UI_BORDER_MUTED } : undefined}
                                                            >
                                                                {pose.name}
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                ))}
                                            </Space>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(180px, 1.5fr)', gap: 12, alignItems: 'center' }}>
                                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Animation speed</Text>
                                            <InputNumber min={0.1} max={10} step={0.1} value={speed} onChange={value => setSpeed(value ?? 1)} style={{ width: '100%' }} />
                                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Loop playback</Text>
                                            <ToggleSwitch title="Loop" titlePlacement="inline" isOn={loop} onToggle={setLoop} textOn="ON" textOff="OFF" width={150} />
                                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Loop count</Text>
                                            <InputNumber min={0} max={999} value={loopCount} disabled={!loop} onChange={value => setLoopCount(value ?? 0)} addonAfter="0 = infinite" style={{ width: '100%' }} />
                                        </div>
                                        {animationValidationError && (
                                            <Text type="danger">{animationValidationError}</Text>
                                        )}
                                        <Space wrap>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                loading={loading}
                                                disabled={Boolean(animationValidationError)}
                                                onClick={() => void saveAnimation()}
                                                style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                            >
                                                {selectedAnimationId ? 'UPDATE ANIMATION' : 'SAVE ANIMATION'}
                                            </Button>
                                            <Button onClick={closeAnimationEditor}>CANCEL</Button>
                                        </Space>
                                    </Space>
                                </div>
                            )}
                        </Space>
                    </section>
                </Space>
            </MovableModal>
        </>
    );
};