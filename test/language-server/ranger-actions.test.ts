import { describe, test } from 'vitest';

import { testQuickFix } from '../../src/utils/test';

describe('RangerActionProvider', () => {
    describe('fixEntity', () => {
        test('makeUpperCase', async () => {
            await testQuickFix({
                before: 'Entity customer {}',
                after: 'Entity Customer {}',
            });
        });
    });

    describe('fixFilePath', () => {
        test('replaceWithForwardSlashes', async () => {
            await testQuickFix({
                before: `
                Entity Customer {
                    data: csv(".\\\\folder\\\\customer.csv")
                }`,
                after: `
                Entity Customer {
                    data: csv("./folder/customer.csv")
                }`,
            });
        });
    });

    describe('fixMapToList', () => {
        test('convertTo_MapToObject', async () => {
            await testQuickFix({
                before: `
                Entity Customer {
                    gender: "male"
                    name: map(gender => ["Max", "Anna"])
                }`,
                after: `
                Entity Customer {
                    gender: "male"
                    name: map(gender => {"val0": "Max", "val1": "Anna"})
                }`,
            });
        });
    });
});
