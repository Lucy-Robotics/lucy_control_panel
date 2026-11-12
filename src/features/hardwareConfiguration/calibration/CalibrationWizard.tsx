/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, ConfigProvider, Select, Space, Steps, Table, theme, Typography } from 'antd';
import { LucyLoader } from '../../../Components/LucyLoader.tsx';
import { ROUTES } from '../../../Constants/routes.ts';
import { UI_CARD_SURFACE_STYLE } from '../../../Constants/uiTheme.ts';
import { useRobotModel } from '../../../hooks/useRobotModel.ts';
import {
    nextJoint,
    requiredHealthOk,
    WIZARD_STEPS,
    wizardStepIndex,
} from './calibrationModel.ts';
import { CalibrationHealthChecks } from './CalibrationHealthChecks.tsx';
import { CalibrationRobotPreview } from './CalibrationRobotPreview.tsx';
import { JointRangeBar } from './JointRangeBar.tsx';
import type { useCalibrationSession } from './useCalibrationSession.ts';
import { useKeyboardAccept } from './useKeyboardAccept.ts';
import { WizardFooter } from './WizardFooter.tsx';
import { stepBody, textColumn, twoColumns } from './calibrationLayout.ts';

const { Paragraph, Text, Title } = Typography;


export interface CalibrationWizardProps {
    session: ReturnType<typeof useCalibrationSession>;
}

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ session }) => {
    const { status, busy, error, activated, activation, send, activate, resetActivation } = session;
    const { robot, loading: robotLoading, reload } = useRobotModel();
    const navigate = useNavigate();
    const { token } = theme.useToken();
    const joint = status.recording
        ? status.joints.find((j) => j.name === status.recording) ?? null
        : nextJoint(status);

    /** Close the session and hand over to the control page, where the arm is driven as usual. */
    const finishAndOpenControl = async () => {
        if (await send('finish')) navigate(ROUTES.control);
    };

    const activateAndReload = async () => {
        if (!(await activate())) return;
        reload();
        await finishAndOpenControl();
    };

    // Activated already, or a session left in the old Verify step: only finishing is left to do.
    const onlyFinish = activated || status.phase === 'verify_drive';

    const backToReview = async () => {
        resetActivation();
        await send('back_to_review');
    };

    const needsAdapterChoice = status.link === 'ambiguous' || status.link === 'selected_missing';
    const recording = status.phase === 'joints' && joint !== null && status.recording === joint.name;
    const canAccept = recording && !busy && Boolean(status.range);

    const primaryEnabled = (() => {
        switch (status.phase) {
            case 'idle':
                return !busy;
            case 'mid_pose':
                return requiredHealthOk(status.health) && !busy;
            case 'joints':
                return canAccept;
            case 'review':
                return !busy;
            case 'applied':
            case 'verify_drive':
                return !busy;
            default:
                return false;
        }
    })();
    const runPrimaryAction = () => {
        switch (status.phase) {
            case 'idle':
                void send('start');
                break;
            case 'mid_pose':
                void send('capture_mid');
                break;
            case 'joints':
                void send('accept_joint');
                break;
            case 'review':
                void send('apply');
                break;
            case 'applied':
            case 'verify_drive':
                void (onlyFinish ? finishAndOpenControl() : activateAndReload());
                break;
            default:
                break;
        }
    };
    useKeyboardAccept(primaryEnabled, runPrimaryAction);

    const cancelButton = <Button disabled={busy} onClick={() => void send('cancel')}>Cancel</Button>;

    return (
        <Card
            style={{ ...UI_CARD_SURFACE_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
            data-testid="calibration-wizard"
            data-phase={status.phase}
        >
            <div style={{ width: '100%', maxWidth: 760, margin: '0 auto 20px' }}>
                {/* Lines in the grey of the waiting steps; titles below so every line is as long. */}
                <ConfigProvider theme={{ components: { Steps: { colorSplit: token.colorFillContent } } }}>
                    <Steps
                        size="small"
                        labelPlacement="vertical"
                        current={wizardStepIndex(status.phase)}
                        items={WIZARD_STEPS.map((title) => ({ title }))}
                    />
                </ConfigProvider>
            </div>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    data-testid="calibration-error"
                    data-code={error.code}
                    message={error.message}
                    style={{ marginBottom: 12 }}
                />
            )}
            {status.warnings.map((warning) => (
                <Alert key={warning} type="warning" showIcon message={warning} style={{ marginBottom: 12 }} />
            ))}
            {status.message && status.phase !== 'recovery' && (
                <Alert type="info" showIcon message={status.message} style={{ marginBottom: 12 }} />
            )}

            {status.phase === 'recovery' && (
                <>
                    <Alert
                        type="warning"
                        showIcon
                        message={status.message}
                        description="Resume to carry on where it stopped. Restore to put the servos back as they were. Discard to drop it without touching the servos."
                        style={{ marginBottom: 12 }}
                    />
                    <div style={stepBody} />
                    <WizardFooter
                        left={(
                            <Button disabled={busy} onClick={() => void send('discard')}>Discard</Button>
                        )}
                        right={(
                            <>
                                <Button disabled={busy} onClick={() => void send('restore')}>Restore</Button>
                                <Button type="primary" disabled={busy} onClick={() => void send('resume')}>
                                    Resume
                                </Button>
                            </>
                        )}
                    />
                </>
            )}

            {status.phase === 'idle' && (
                <>
                    <div style={stepBody}>
                        <div style={twoColumns}>
                            <div style={textColumn}>
                                <Title level={4}>Calibrate this arm</Title>
                                <Paragraph>
                                    Teaches Lucy where each joint&apos;s middle and limits are, one joint at a time. It
                                    takes a few minutes, and the servos stay unpowered until the final check.
                                </Paragraph>
                                <CalibrationHealthChecks
                                    health={status.health.filter((c) => c.id !== 'control_lock')}
                                />
                                {needsAdapterChoice && (
                                    <Space style={{ margin: '12px 0' }} wrap>
                                        <Text>Which arm?</Text>
                                        <Select
                                            style={{ minWidth: 220 }}
                                            placeholder="USB adapter"
                                            options={status.adapters
                                                .filter((a) => a.serial)
                                                .map((a) => ({ value: a.serial as string, label: `${a.serial} (${a.port})` }))}
                                            onChange={(serial: string) => void send('select_adapter', serial)}
                                        />
                                    </Space>
                                )}
                            </div>
                            <CalibrationRobotPreview robot={robot} loading={robotLoading} />
                        </div>
                    </div>
                    <WizardFooter
                        right={(
                            <>
                                <Button disabled={busy} onClick={() => void send('adopt')}>
                                    Already calibrated: use the active preset
                                </Button>
                                <Button type="primary" disabled={busy} onClick={() => void send('start')}>
                                    Start calibration
                                </Button>
                            </>
                        )}
                    />
                </>
            )}

            {status.phase === 'mid_pose' && (
                <>
                    <div style={stepBody}>
                        <div style={twoColumns}>
                            <div style={textColumn}>
                                <Title level={4}>Put the arm in this pose</Title>
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 12 }}
                                    message="The arm is unpowered and can drop"
                                    description="Support it, and hold it in the middle of each joint's travel, like the 3D view."
                                />
                                {!requiredHealthOk(status.health) && (
                                    <CalibrationHealthChecks health={status.health} />
                                )}
                            </div>
                            <CalibrationRobotPreview robot={robot} loading={robotLoading} />
                        </div>
                    </div>
                    <WizardFooter
                        left={cancelButton}
                        right={(
                            <Button
                                type="primary"
                                loading={busy}
                                disabled={!requiredHealthOk(status.health)}
                                onClick={() => void send('capture_mid')}
                            >
                                The arm is in this pose
                            </Button>
                        )}
                    />
                </>
            )}

            {status.phase === 'joints' && joint && (
                <>
                    <div style={stepBody}>
                        <div style={twoColumns}>
                            <div style={textColumn}>
                                <Title level={4}>{joint.name}</Title>
                                <Text type="secondary">
                                    Joint {status.joints.indexOf(joint) + 1} of {status.joints.length}
                                </Text>
                                <Paragraph style={{ marginTop: 12 }}>
                                    {joint.full_turn
                                        ? 'Rotate this joint a good way in both directions. It can turn all the way round.'
                                        : 'Slowly move only this joint all the way to both of its stops, then back to the middle.'}
                                </Paragraph>
                                {recording && (
                                    <>
                                        <JointRangeBar
                                            range={status.range}
                                            ticks={joint.ticks}
                                            minSpan={joint.min_span}
                                        />
                                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                            Press Enter or Space to accept and move on to the next joint.
                                        </Text>
                                    </>
                                )}
                            </div>
                            <CalibrationRobotPreview robot={robot} loading={robotLoading} demoJoint={joint.name} />
                        </div>
                    </div>
                    <WizardFooter
                        left={cancelButton}
                        right={(
                            <>
                                {error?.code === 'span_too_small' && (
                                    <Button disabled={busy} onClick={() => void send('accept_joint', 'override')}>
                                        Accept anyway
                                    </Button>
                                )}
                                <Button disabled={busy} onClick={() => void send('begin_joint', joint.name)}>
                                    Start over
                                </Button>
                                <Button type="primary" disabled={!canAccept} onClick={() => void send('accept_joint')}>
                                    Accept and continue
                                </Button>
                            </>
                        )}
                    />
                </>
            )}

            {status.phase === 'review' && (
                <>
                    <div style={stepBody}>
                        <Title level={4}>Review</Title>
                        <Table
                            size="small"
                            pagination={false}
                            rowKey="name"
                            dataSource={status.joints.map((j) => ({
                                name: j.name,
                                low: status.accepted[j.name]?.[0],
                                high: status.accepted[j.name]?.[1],
                            }))}
                            columns={[
                                { title: 'Joint', dataIndex: 'name' },
                                { title: 'Lowest tick', dataIndex: 'low' },
                                { title: 'Highest tick', dataIndex: 'high' },
                                {
                                    title: '',
                                    key: 'redo',
                                    render: (_, row) => (
                                        <Button
                                            size="small"
                                            disabled={busy}
                                            onClick={() => void send('begin_joint', row.name)}
                                        >
                                            Redo
                                        </Button>
                                    ),
                                },
                            ]}
                        />
                    </div>
                    <WizardFooter
                        left={cancelButton}
                        right={(
                            <Button type="primary" disabled={busy} onClick={() => void send('apply')}>Save preset</Button>
                        )}
                    />
                </>
            )}

            {(status.phase === 'applied' || status.phase === 'verify_drive') && (
                <>
                    <div style={stepBody}>
                        <Title level={4}>Activate {status.preset}</Title>
                        <Paragraph>
                            Saved. Activating regenerates the robot&apos;s configuration and restarts its control
                            stack, then opens the control page. Torque stays off until you turn Control Robot on.
                        </Paragraph>
                        {activation && (
                            <div style={{ marginBottom: 12 }}>
                                <LucyLoader label={activation} />
                            </div>
                        )}
                    </div>
                    <WizardFooter
                        left={cancelButton}
                        right={(
                            <>
                                <Button disabled={busy} onClick={() => void backToReview()}>Back to review</Button>
                                {onlyFinish ? (
                                    <Button type="primary" loading={busy} onClick={() => void finishAndOpenControl()}>
                                        Finish and open the control page
                                    </Button>
                                ) : (
                                    <Button type="primary" loading={busy} onClick={() => void activateAndReload()}>
                                        Activate and reload
                                    </Button>
                                )}
                            </>
                        )}
                    />
                </>
            )}
        </Card>
    );
};
