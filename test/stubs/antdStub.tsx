/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Stands in for antd for static-rendering tests: real antd (and @ant-design/icons, see
 * the sibling stub) hits a dual-package ESM/CJS resolution hazard under Vite's SSR
 * module loader that isn't worth chasing here. These components keep just enough shape
 * (props passed through, Table/Select/Steps iterating their data) for the wizard's own
 * render-phase logic to execute and render real content, which is what this harness
 * actually needs covered.
 */
import React from 'react';

interface PassthroughProps {
    children?: React.ReactNode;
    [key: string]: unknown;
}

export const Button: React.FC<PassthroughProps> = ({ children, ...rest }) => (
    <button {...rest}>{children}</button>
);
export const Card: React.FC<PassthroughProps> = ({ children, ...rest }) => <div {...rest}>{children}</div>;
export const Space: React.FC<PassthroughProps> = ({ children, ...rest }) => <div {...rest}>{children}</div>;
export const ConfigProvider: React.FC<PassthroughProps> = ({ children }) => <>{children}</>;

interface AlertProps {
    message?: React.ReactNode;
    description?: React.ReactNode;
    [key: string]: unknown;
}

export const Alert: React.FC<AlertProps> = ({ message, description, ...rest }) => (
    <div {...rest}>
        {message}
        {description}
    </div>
);

interface StepsProps {
    items?: { title: React.ReactNode }[];
    [key: string]: unknown;
}

export const Steps: React.FC<StepsProps> = ({ items = [], ...rest }) => (
    <div {...rest}>
        {items.map((item, i) => (
            <span key={i}>{item.title}</span>
        ))}
    </div>
);

interface SelectProps {
    options?: { value: string; label: React.ReactNode }[];
    onChange?: (value: string) => void;
    [key: string]: unknown;
}

export const Select: React.FC<SelectProps> = ({ options = [], onChange, ...rest }) => (
    <select {...rest} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((o) => (
            <option key={o.value} value={o.value}>
                {o.label}
            </option>
        ))}
    </select>
);

interface TableColumn {
    key?: string;
    dataIndex?: string;
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface TableProps {
    dataSource?: Record<string, unknown>[];
    columns?: TableColumn[];
    rowKey?: string;
}

export const Table: React.FC<TableProps> = ({ dataSource = [], columns = [], rowKey }) => (
    <table>
        <tbody>
            {dataSource.map((row, rowIndex) => (
                <tr key={typeof rowKey === 'string' ? (row[rowKey] as string) : rowIndex}>
                    {columns.map((col, colIndex) => {
                        const value = col.dataIndex ? row[col.dataIndex] : undefined;
                        return (
                            <td key={col.key ?? col.dataIndex ?? colIndex}>
                                {col.render ? col.render(value, row) : (value as React.ReactNode)}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    </table>
);

const Paragraph: React.FC<PassthroughProps> = ({ children, ...rest }) => <p {...rest}>{children}</p>;
const Text: React.FC<PassthroughProps> = ({ children, ...rest }) => <span {...rest}>{children}</span>;
const Title: React.FC<PassthroughProps> = ({ children, ...rest }) => <h4 {...rest}>{children}</h4>;

export const Typography = { Paragraph, Text, Title };

export const theme = {
    useToken: () => ({ token: { colorFillContent: '#000000' } }),
};
