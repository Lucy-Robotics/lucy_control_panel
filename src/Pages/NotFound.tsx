/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
    MAIN_COLOR,
    MAIN_DEEP,
    SECONDARY_COLOR,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    STATUS_ERROR,
    fonts,
} from '../Constants/theme.ts';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import { CustomTitle } from '../Components/CustomTitle.tsx';

const { Text } = Typography;

export const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const headerHeight = useContext(HeaderHeightContext);

    return (
        <main
            style={{
                minHeight: `calc(100dvh - ${headerHeight}px - 60px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px',
                boxSizing: 'border-box',
            }}
        >
            <Card
                bordered
                style={{
                    width: 'min(100%, 580px)',
                    background: MAIN_COLOR,
                    borderColor: SECONDARY_COLOR,
                    borderRadius: 0,
                    boxShadow: `0 16px 48px rgba(0, 0, 0, 0.8), 0 0 1px ${SECONDARY_COLOR}`,
                }}
                styles={{ body: { padding: 0 } }}
            >
                <div
                    style={{
                        padding: '12px 20px',
                        borderBottom: `1px solid ${SECONDARY_COLOR}`,
                        background: MAIN_DEEP,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <CustomTitle title="LUCY" subtitle="NAVIGATION" level={5} />
                    <span style={{ color: STATUS_ERROR, fontFamily: fonts.mono, fontWeight: 'bold', fontSize: 12 }}>
                        ERR: 404
                    </span>
                </div>

                <div style={{ padding: 'clamp(28px, 6vw, 48px)' }}>
                    <Text
                        style={{
                            display: 'block',
                            color: 'var(--color-highlight)',
                            fontFamily: fonts.graphical,
                            fontSize: 'clamp(64px, 16vw, 96px)',
                            fontWeight: 700,
                            lineHeight: 0.9,
                            letterSpacing: '2px',
                        }}
                    >
                        404
                    </Text>

                    <div style={{ margin: '24px 0 12px' }}>
                        <CustomTitle
                            title="ROUTE NOT FOUND"
                            subtitle="SYSTEM ERROR"
                            level={2}
                        />
                    </div>

                    <Text style={{ color: TEXT_SECONDARY, fontSize: 14, fontFamily: fonts.content, display: 'block' }}>
                        Lucy control system could not locate the requested interface route.
                    </Text>

                    <Space wrap size="middle" style={{ marginTop: 32 }}>
                        <Button
                            type="primary"
                            icon={<HomeOutlined />}
                            onClick={() => navigate('/')}
                            style={{
                                background: 'var(--color-highlight)',
                                borderColor: 'var(--color-highlight)',
                                color: 'var(--color-text-on-highlight)',
                                fontWeight: 'bold',
                                borderRadius: 0,
                            }}
                        >
                            RETURN HOME
                        </Button>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'transparent',
                                borderColor: SECONDARY_COLOR,
                                color: TEXT_PRIMARY,
                                borderRadius: 0,
                            }}
                        >
                            GO BACK
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'transparent',
                                borderColor: SECONDARY_COLOR,
                                color: TEXT_PRIMARY,
                                borderRadius: 0,
                            }}
                        >
                            RELOAD
                        </Button>
                    </Space>
                </div>
            </Card>
        </main>
    );
};

export default NotFound;
