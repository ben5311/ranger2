import dedent from 'dedent-js';
import { describe, test } from 'vitest';

import { testFormatting } from '../../src/utils/test';

describe('RangerFormatter', () => {
    test('Indent Properties', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {name: "John Doe", address: {state: "CA", city: "Los Angeles"}}

            `,
            after: dedent`
            Entity Customer {
                name: "John Doe",
                address: {
                    state: "CA",
                    city: "Los Angeles"
                }
            }

            `,
        });
    });

    test('Space between Property key and value', async () => {
        await testFormatting({
            before: dedent`
            Entity Customer {
                name:"John Doe"
            }

            `,
            after: dedent`
            Entity Customer {
                name: "John Doe"
            }

            `,
        });
    });

    test('Format imports', async () => {
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

        await testFormatting({
            before: dedent`
            from "./Test1.ranger" import Test1

            from "./Test2.ranger" import Test2
            // An Entity
            Entity Test3 {
            }

            `,
            after: dedent`
            from "./Test1.ranger" import Test1
            from "./Test2.ranger" import Test2

            // An Entity
            Entity Test3 {
            }

            `,
        });

        await testFormatting({
            before: dedent`
            from "./Test1.ranger" import Test1
            // A Comment

            `,
            after: dedent`
            from "./Test1.ranger" import Test1

            // A Comment

            `,
        });
    });

    test('Sort imports', async () => {
        await testFormatting({
            before: dedent`
            from "./Test2.ranger" import EntityC, EntityB, EntityA
            from "./Test1.ranger" import EntityD

            `,
            after: dedent`
            from "./Test1.ranger" import EntityD
            from "./Test2.ranger" import EntityA, EntityB, EntityC

            `,
        });
    });

    test('Optimize imports', async () => {
        await testFormatting({
            before: dedent`
            from "./Test.ranger" import EntityA, EntityA
            from "./Test.ranger" import EntityA
            from "./Test.ranger" import EntityB
            from "./Test.ranger" import EntityC

            `,
            after: dedent`
            from "./Test.ranger" import EntityA, EntityB, EntityC

            `,
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

    test('No indentation before Import', async () => {
        await testFormatting({
            before: `
              from "./Test1.ranger" import Test
              from "./Test2.ranger" import Test

            `,
            after: dedent`
            from "./Test1.ranger" import Test
            from "./Test2.ranger" import Test

            `,
        });
    });

    test('No indentation before Entity', async () => {
        await testFormatting({
            before: `\
              // A Customer
              Entity Customer {
              }

            `,
            after: dedent`
            // A Customer
            Entity Customer {
            }

            `,
        });
    });

    test('Strip leading whitespace', async () => {
        await testFormatting({
            before: `\n\nfrom "./Test.ranger" import Test\n`,
            after: `from "./Test.ranger" import Test\n`,
        });

        await testFormatting({
            before: `\n\nEntity Test {\n}\n`,
            after: `Entity Test {\n}\n`,
        });
    });

    test('Strip trailing whitespace', async () => {
        await testFormatting({
            before: `from "./Test.ranger" import Test  \n\n\n`,
            after: `from "./Test.ranger" import Test\n`,
        });

        await testFormatting({
            before: `Entity Test {\n}  \n\n\n`,
            after: `Entity Test {\n}\n`,
        });
    });
});
