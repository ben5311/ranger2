import { beforeEach, describe, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { Config, resetConfig } from '../../src/language-server/ranger-config';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, expectError, expectInfo, expectNoIssues, expectWarning, validate } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
    resetConfig();
});

describe('RangerValidator', () => {
    describe('checkDocument', () => {
        test('EntityNameStartsWithCapital', async () => {
            let validation = await validate(`
            Entity Customer {}`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity customer {}`);
            expectWarning(validation, Issues.Entity_NameNotCapitalized.code, {
                node: validation.document.parseResult.value.entities[0],
                property: 'name',
            });
        });

        test('NoDuplicateEntities', async () => {
            let validation = await validate(`
            Entity Customer {}`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity Customer {}
            Entity Customer {}`);
            expectError(validation, Issues.Document_DuplicateEntity.code, {
                node: validation.document.parseResult.value.entities[0],
                property: 'name',
            });
        });
    });

    describe('checkObjekt', () => {
        test('NoDuplicateProperties', async () => {
            let validation = await validate(`
            Entity Customer {
                name: "John Doe"
            }`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity Customer {
                name: "John Doe"
                name: "John Doe"
            }`);
            let objekt = validation.document.parseResult.value.entities[0].value as Objekt;
            expectError(validation, Issues.Objekt_DuplicateProperty.code, {
                node: objekt.properties[0],
                property: 'name',
            });
        });

        test('ShowDebugInfo', async () => {
            Config.debug = true;
            let validation = await validate(`
            Entity Customer {
                name: "John Doe"
                age: 28
                married: false
                phone: null
            }`);
            let objekt = validation.document.parseResult.value.entities[0].value as Objekt;
            let props = objekt.properties;
            expectInfo(validation, Issues.DebugInfo.code, { node: props[0], property: 'value', message: '"John Doe"' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[1], property: 'value', message: '28' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[2], property: 'value', message: 'false' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[3], property: 'value', message: 'null' });
        });
    });

    describe('checkPrintStatement', () => {
        test('ShowDebugInfo', async () => {
            let validation = await validate(`
            Entity Customer {
                name: "John Doe"
                age: 28
                married: false
                address: {
                    state: "CA"
                    city: "Los Angeles"
                }
            }
            print(Customer)
            print(Customer.address)`);
            expectInfo(validation, Issues.DebugInfo.code, {
                range: { start: { line: 10, character: 18 }, end: { line: 10, character: 26 } },
                message: '{"name":"John Doe","age":28,"married":false,"address":{"state":"CA","city":"Los Angeles"}}',
            });
            expectInfo(validation, Issues.DebugInfo.code, {
                range: { start: { line: 11, character: 18 }, end: { line: 11, character: 34 } },
                message: '{"state":"CA","city":"Los Angeles"}',
            });
        });
    });
});
