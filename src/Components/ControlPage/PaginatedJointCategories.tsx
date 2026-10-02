/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import { Pagination } from 'antd';
import { JointCategory } from './JointCategory';
import type { JointControlState } from '../../Constants/robotTypes';
import { usePaginatedCategories } from '../../contexts/PaginatedCategoriesContext';

export type CategorizedJoints = Record<string, JointControlState[]>;

export interface PaginatedJointCategoriesProps {
    categoryOrder: string[];
    categorizedJoints: CategorizedJoints;
    onJointValueChange: (name: string, value: number) => void;
    onResetCategory: (category: string) => void;
    onResetJoint?: (name: string) => void;
    showDegrees: boolean;
    disabled: boolean;
}

const PaginatedJointCategories = ({
    categoryOrder,
    categorizedJoints,
    onJointValueChange,
    onResetCategory,
    onResetJoint,
    showDegrees,
    disabled,
}: PaginatedJointCategoriesProps) => {
    const [categoryPage, setCategoryPage] = useState<number>(1);
    const { categoriesPerPage } = usePaginatedCategories();

    useEffect(() => {
        setCategoryPage(1);
    }, [categoriesPerPage]);

    const anchor: React.CSSProperties = {
        position: 'fixed',
        bottom: 20,
        left: 30, // Aligned with 30px screen border
        zIndex: 1000,
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
    };

    const validCategories = useMemo<string[]>(
        () => categoryOrder.filter(
            category => categorizedJoints[category] && categorizedJoints[category].length > 0
        ),
        [categoryOrder, categorizedJoints]
    );

    const paginatedCategories = useMemo<string[]>(() => {
        const start = (categoryPage - 1) * categoriesPerPage;
        return validCategories.slice(start, start + categoriesPerPage);
    }, [validCategories, categoryPage, categoriesPerPage]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gridAutoRows: '1fr',
                    gap: '12px',
                    width: '100%',
                    alignItems: 'stretch',
                }}
            >
                {paginatedCategories.map(category => (
                    <div key={category} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <JointCategory
                            category={category}
                            joints={categorizedJoints[category]}
                            onJointValueChange={onJointValueChange}
                            onResetCategory={onResetCategory}
                            onResetJoint={onResetJoint}
                            showDegrees={showDegrees}
                            disabled={disabled}
                        />
                    </div>
                ))}
            </div>

            {validCategories.length > categoriesPerPage && (
                <div style={anchor} className="chamfer-box category-pagination-anchor">
                    <Pagination
                        current={categoryPage}
                        pageSize={categoriesPerPage}
                        total={validCategories.length}
                        showSizeChanger={false}
                        onChange={setCategoryPage}
                        hideOnSinglePage
                        itemRender={(page, type, originalElement) => {
                            if (type === 'page') {
                                const pageCategories = validCategories.slice(
                                    (page - 1) * categoriesPerPage,
                                    page * categoriesPerPage,
                                );

                                return (
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '0 12px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {pageCategories.join(' / ')}
                                    </span>
                                );
                            }

                            return originalElement;
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default PaginatedJointCategories;
