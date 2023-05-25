import { describe, expect, test } from 'vitest';

import { RangerDefinitionProvider } from '../../src/language-server/ranger-definition';
import { fileURI } from '../../src/language-server/ranger-documents';
import { createTempDir, getPositionParams, parseDocument, services } from '../../src/utils/test';

const definitionProvider = new RangerDefinitionProvider(services);

describe('RangerDefinitionProvider', () => {
    test('Go To FilePath', async () => {
        let tempdir = createTempDir();
        tempdir.createFile('User.ranger');

        let document = await parseDocument({
            filePath: `${tempdir.name}/Test.ranger`,
            text: 'from "./User.ranger" import User',
        });

        let params = getPositionParams(document, { line: 0, character: 6 });
        let links = await definitionProvider.getDefinition(document, params);

        expect(links).toStrictEqual([
            {
                originSelectionRange: {
                    start: { line: 0, character: 5 },
                    end: { line: 0, character: 20 },
                },
                targetRange: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                targetSelectionRange: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                targetUri: fileURI(`${tempdir.name}/User.ranger`).toString(),
            },
        ]);
    });
});
