import { describe, test } from 'vitest';

import { fix } from '../../src/utils/test';

describe('RangerActionProvider', () => {
    describe('fixEntity', () => {
        test('NameStartsWithCapital', async () => {
            await fix({
                before: 'Entity customer {}',
                after: 'Entity Customer {}',
            });
        });
    });
});
