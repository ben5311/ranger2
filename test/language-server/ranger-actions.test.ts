import { describe, test } from 'vitest';

import { testQuickFix } from '../../src/utils/test';

describe('RangerActionProvider', () => {
    describe('fixEntity', () => {
        test('NameStartsWithCapital', async () => {
            await testQuickFix({
                before: 'Entity customer {}',
                after: 'Entity Customer {}',
            });
        });
    });
});
