/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Grid, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
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

const { useBreakpoint } = Grid;

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

    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const tabListRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    // Space kept free on the right so the strip never runs under the floating page nav
    const [navInset, setNavInset] = useState(0);

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

    const pageLabels = useMemo<string[]>(() => {
        const labels: string[] = [];
        for (let start = 0; start < validCategories.length; start += categoriesPerPage) {
            labels.push(validCategories.slice(start, start + categoriesPerPage).join(' / '));
        }
        return labels;
    }, [validCategories, categoriesPerPage]);
    const pageCount = pageLabels.length;

    // Keep the active tab visible when paging or when the panel is resized.
    // Scrolls the tab list only (scrollIntoView would also scroll the page).
    useEffect(() => {
        const list = tabListRef.current;
        if (!list) return;
        const reveal = () => {
            const tab = tabRefs.current.get(categoryPage);
            if (!tab) return;
            if (tab.offsetLeft < list.scrollLeft) {
                list.scrollLeft = tab.offsetLeft;
            } else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
                list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
            }
        };
        reveal();
        const observer = new ResizeObserver(reveal);
        observer.observe(list);
        return () => observer.disconnect();
    }, [categoryPage, pageCount]);

    useEffect(() => {
        const strip = stripRef.current;
        const container = strip?.parentElement;
        if (isMobile || !strip || !container) {
            setNavInset(0);
            return;
        }
        const measure = () => {
            const nav = document.querySelector('.lucy-navigation-bar');
            if (!nav) return setNavInset(0);
            const navRect = nav.getBoundingClientRect();
            const stripRect = strip.getBoundingClientRect();
            const containerRight = container.getBoundingClientRect().right;
            const overlapsVertically = stripRect.bottom > navRect.top && stripRect.top < navRect.bottom;
            setNavInset(overlapsVertically ? Math.max(0, containerRight - navRect.left + 12) : 0);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [isMobile, pageCount]);

    const goToPage = (page: number) => setCategoryPage(Math.min(Math.max(page, 1), pageCount));

    const handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const next = Math.min(Math.max(categoryPage + (event.key === 'ArrowRight' ? 1 : -1), 1), pageCount);
        setCategoryPage(next);
        tabRefs.current.get(next)?.focus();
    };

    // On mobile the page scrolls, so the strip sticks just above the fixed bottom nav
    const stripStyle: React.CSSProperties = isMobile
        ? { position: 'sticky', bottom: 'calc(var(--mobile-nav-height, 48px) + 8px)', zIndex: 3 }
        : { marginRight: navInset };

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

            {pageCount > 1 && (
                <div ref={stripRef} className="category-strip" style={stripStyle}>
                    <button
                        type="button"
                        className="rail-btn"
                        aria-label="Previous categories"
                        disabled={categoryPage <= 1}
                        onClick={() => goToPage(categoryPage - 1)}
                    >
                        <LeftOutlined />
                    </button>
                    <div
                        ref={tabListRef}
                        className="category-tabs"
                        role="tablist"
                        aria-label="Joint categories"
                        onKeyDown={handleTabsKeyDown}
                    >
                        {pageLabels.map((label, index) => {
                            const page = index + 1;
                            const isActive = page === categoryPage;
                            return (
                                <Tooltip key={label} title={label} placement="top" mouseEnterDelay={0.4}>
                                    <button
                                        type="button"
                                        role="tab"
                                        className="category-tab"
                                        aria-selected={isActive}
                                        tabIndex={isActive ? 0 : -1}
                                        ref={(node) => {
                                            if (node) tabRefs.current.set(page, node);
                                            else tabRefs.current.delete(page);
                                        }}
                                        onClick={() => goToPage(page)}
                                    >
                                        {label}
                                    </button>
                                </Tooltip>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        className="rail-btn"
                        aria-label="Next categories"
                        disabled={categoryPage >= pageCount}
                        onClick={() => goToPage(categoryPage + 1)}
                    >
                        <RightOutlined />
                    </button>
                </div>
            )}
        </div>
    );
}

export default PaginatedJointCategories;
