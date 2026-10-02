/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    TEXT_SECONDARY,
    STATUS_ERROR,
    fonts,
    rgba,
} from '../Constants/theme.ts';
import { TerminalTitle } from './TerminalTitle.tsx';

const { Text } = Typography;

interface AuthFormProps {
    onLogin: (username: string) => void;
    error?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, error }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async (values: { username: string; password: string }) => {
        setLoading(true);

        try {
            const expectedPassword = import.meta.env.VITE_LOCAL_PASSWORD;
            const expectedUsername = import.meta.env.VITE_LOCAL_USERNAME;

            if (!expectedPassword || !expectedUsername) {
                throw new Error('Authentication not configured');
            }

            if (values.username.toLowerCase() !== expectedUsername.toLowerCase()) {
                throw new Error('Invalid username');
            }

            const hashedPassword = CryptoJS.MD5(values.password).toString();

            if (hashedPassword === expectedPassword) {
                onLogin(values.username);
            } else {
                throw new Error('Invalid password');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            form.setFields([
                {
                    name: 'username',
                    errors: errorMessage.includes('username') ? [errorMessage] : []
                },
                {
                    name: 'password',
                    errors: errorMessage.includes('password') || errorMessage.includes('credentials') ? [errorMessage] : []
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: MAIN_COLOR,
            padding: '30px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 440,
                    backgroundColor: MAIN_COLOR,
                    border: `1px solid ${SECONDARY_COLOR}`,
                    borderRadius: 0,
                    boxShadow: `0 16px 48px rgba(0, 0, 0, 0.8), 0 0 1px ${SECONDARY_COLOR}`
                }}
                styles={{ body: { padding: '40px 32px' } }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <TerminalTitle
                            title="LUCY"
                            separator="//"
                            subtitle="CONTROL PANEL"
                            level="graphical"
                            align="center"
                            style={{ fontSize: '28px' }}
                        />
                    </div>
                    <Text style={{
                        color: TEXT_SECONDARY,
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                    }}>
                        Authentication Required
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{
                            marginBottom: 24,
                            backgroundColor: rgba(STATUS_ERROR, 0.15),
                            borderColor: STATUS_ERROR,
                            borderRadius: 0,
                        }}
                    />
                )}

                <Form
                    form={form}
                    name="login"
                    onFinish={handleSubmit}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[
                            { required: true, message: 'Please enter your username!' },
                            { min: 3, message: 'Username must be at least 3 characters!' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: 'var(--color-highlight)' }} />}
                            placeholder="Username"
                            style={{
                                backgroundColor: 'var(--color-main)',
                                borderColor: 'var(--color-secondary)',
                                color: 'var(--color-text-primary)',
                                fontFamily: fonts.mono,
                                borderRadius: 0,
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Please enter your password!' },
                            { min: 6, message: 'Password must be at least 6 characters!' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: 'var(--color-highlight)' }} />}
                            placeholder="Password"
                            style={{
                                backgroundColor: 'var(--color-main)',
                                borderColor: 'var(--color-secondary)',
                                color: 'var(--color-text-primary)',
                                fontFamily: fonts.mono,
                                borderRadius: 0,
                            }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                height: 48,
                                backgroundColor: 'var(--color-highlight)',
                                borderColor: 'var(--color-highlight)',
                                color: 'var(--color-text-on-highlight)',
                                fontFamily: fonts.mono,
                                fontSize: 16,
                                fontWeight: 'bold',
                                borderRadius: 0,
                                boxShadow: 'none',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{
                    textAlign: 'center',
                    marginTop: 24,
                    padding: '12px',
                    backgroundColor: 'var(--color-main)',
                    border: '1px solid var(--color-secondary)',
                    borderRadius: 0,
                }}>
                    <Text style={{ color: TEXT_SECONDARY, fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.5px' }}>
                        Secure access to Lucy robot control system
                    </Text>
                </div>
            </Card>
        </div>
    );
};

export default AuthForm;
