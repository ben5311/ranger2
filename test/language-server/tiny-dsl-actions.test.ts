import { describe, expect, test } from 'vitest';

import { fix } from '../../src/utils/test';

describe('TinyDslActionProvider', () => {
    describe('fixEntity', () => {
        test('NameStartsWithCapital', async () => {
            const input = `
            package test
            Entity customer {
                String Name
            }`;
            const expectedOutput = `
            package test
            Entity Customer {
                String Name
            }`;
            let actualOutput = await fix(input);
            expect(actualOutput).toBe(expectedOutput);
        });
    });
});
