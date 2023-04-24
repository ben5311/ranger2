import dedent from 'dedent-js';
import { describe, test } from 'vitest';

import { testFormatting } from '../../src/utils/test';

describe('RangerFormatter', () => {
    test('New line after imports', async () => {
        await testFormatting({
            before: dedent`

            from "./Test1.ranger" import Test1

            from "./Test2.ranger" import Test2
            Entity Test3 {
            }
            `,
            after: dedent`
            from "./Test1.ranger" import Test1
            from "./Test2.ranger" import Test2

            Entity Test3 {
            }
            `,
        });
    });

    test('No indentation before Import', async () => {
        await testFormatting({
            before: dedent`
              from "./Test1.ranger" import Test1`,
            after: dedent`
            from "./Test1.ranger" import Test1`,
        });
    });

    test('New line after entities', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {
            }
            // This is an Account.
            Entity Account {
            }
            `,
            after: dedent`
            Entity Customer {
            }

            // This is an Account.
            Entity Account {
            }
            `,
        });
    });

    test('No indentation before Entity', async () => {
        await testFormatting({
            before: dedent`
              Entity Customer {
              }
            `,
            after: dedent`
            Entity Customer {
            }
            `,
        });
    });

    test('Indent Properties', async () => {
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

    test('Space between Property key and value', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {
                name:"John Doe"
            }`,
            after: dedent`
            Entity Customer {
                name: "John Doe"
            }`,
        });
    });
});
