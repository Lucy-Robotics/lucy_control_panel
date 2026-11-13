import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GHOST_OPACITY, parseGhostOpacity } from '../src/hooks/useGhostOpacity.ts';

test('a stored ghost opacity between 0 and 1 is kept', () => {
    assert.equal(parseGhostOpacity('0.4'), 0.4);
});

test('a missing or out-of-range ghost opacity falls back to the default', () => {
    for (const stored of [null, 'abc', '-0.1', '1.5']) {
        assert.equal(parseGhostOpacity(stored), DEFAULT_GHOST_OPACITY);
    }
});
