import dedent from 'dedent-js';
import { describe, test } from 'vitest';

import { testFormatting } from '../../src/utils/test';

describe('RangerFormatter', () => {
    test('New lines between entities', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {
            }
            Entity Account {
            }`,
            after: dedent`
            Entity Customer {
            }

            Entity Account {
            }`,
        });
    });

    test('Indent properties', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {name: "John Doe", address: {state: "CA", city: "Los Angeles"}}`,
            after: dedent`
            Entity Customer {
                name: "John Doe",
                address: {
                    state: "CA",
                    city: "Los Angeles"
                }
            }`,
        });
    });

    test('New line after print statements', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {}
            print(Customer) print(Customer)`,
            after: dedent`
            Entity Customer {
            }

            print(Customer)
            print(Customer)`,
        });
    });
});
