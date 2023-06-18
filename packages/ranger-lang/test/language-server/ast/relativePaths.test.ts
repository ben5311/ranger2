import { describe, expect, test } from 'vitest';

import { createObjectGenerator, createTempDir } from '../../../src/utils/test';

describe('Relative paths', () => {
    test('Generate', async () => {
        const tempDir = createTempDir();
        tempDir.createFile('data/data.csv', 'first,second,third\r\n1,2,3');

        const generator = await createObjectGenerator({
            filePath: `${tempDir.name}/Test.ranger`,
            text: `
            Entity Test {
                data: csv("./data/data.csv", delimiter=",")
            }`,
        });

        const output = generator.next();

        expect(output).toStrictEqual({
            data: {
                first: '1',
                second: '2',
                third: '3',
            },
        });
    });
});
