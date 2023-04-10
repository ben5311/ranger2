import dedent from 'dedent-js';
import fs from 'fs';
import { describe, test } from 'vitest';

import { generateOutputFile } from '../../src/cli';
import { createTempDir, expectFileContent } from '../../src/utils/test';

const testEntity = `
Entity User {
    id: 1
    name: "Max"
    active: true
    balance: null
    address: {email: "max@gmail.com"}
}`;

describe('CLI', () => {
    test('Generate JSONL file', async () => {
        const tempDir = createTempDir();
        const inputFile = `${tempDir.name}/User.ranger`;
        fs.writeFileSync(inputFile, testEntity);

        await generateOutputFile(inputFile, { count: 5, format: 'jsonl', outputDir: tempDir.name });
        expectFileContent(
            `${tempDir.name}/User.jsonl`,
            dedent`
            {"id":1,"name":"Max","active":true,"balance":null,"address":{"email":"max@gmail.com"}}
            {"id":1,"name":"Max","active":true,"balance":null,"address":{"email":"max@gmail.com"}}
            {"id":1,"name":"Max","active":true,"balance":null,"address":{"email":"max@gmail.com"}}
            {"id":1,"name":"Max","active":true,"balance":null,"address":{"email":"max@gmail.com"}}
            {"id":1,"name":"Max","active":true,"balance":null,"address":{"email":"max@gmail.com"}}

            `,
        );
    });

    test('Generate CSV file', async () => {
        const tempDir = createTempDir();
        const inputFile = `${tempDir.name}/User.ranger`;
        fs.writeFileSync(inputFile, testEntity);

        await generateOutputFile(inputFile, { count: 5, format: 'csv', outputDir: tempDir.name });
        expectFileContent(
            `${tempDir.name}/User.csv`,
            dedent`
            id,name,active,balance,address
            1,Max,true,,"{""email"":""max@gmail.com""}"
            1,Max,true,,"{""email"":""max@gmail.com""}"
            1,Max,true,,"{""email"":""max@gmail.com""}"
            1,Max,true,,"{""email"":""max@gmail.com""}"
            1,Max,true,,"{""email"":""max@gmail.com""}"

            `,
        );
    });
});
