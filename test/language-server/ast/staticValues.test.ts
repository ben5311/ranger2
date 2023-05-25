import dedent from 'dedent-js';
import { describe, expect, test } from 'vitest';

import { createObjectGenerator, entities, hover, parseDocument, properties } from '../../../src/utils/test';

describe('Static values', () => {
    const document = `
    Entity User {
        name: "John Doe"
        age: 28
        birthday: null
        married: false
        balance: 1000.51
        address: { email: ["john.doe@gmail.com"] }
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        const output = generator.next();

        expect(output).toStrictEqual({
            name: 'John Doe',
            age: 28,
            birthday: null,
            married: false,
            balance: 1000.51,
            address: { email: ['john.doe@gmail.com'] },
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let User = entities(doc).first();
        let [name, age, birthday, married, balance, address] = properties(doc);
        let email = properties(address).first()!;

        expect(hover(name)).toBe('name: "John Doe"');
        expect(hover(age)).toBe('age: 28');
        expect(hover(birthday)).toBe('birthday: null');
        expect(hover(married)).toBe('married: false');
        expect(hover(balance)).toBe('balance: 1000.51');

        expect(hover(name.value)).toBe('"John Doe" : string');
        expect(hover(age.value)).toBe('28 : number');
        expect(hover(birthday.value)).toBe('null');
        expect(hover(married.value)).toBe('false : boolean');
        expect(hover(balance.value)).toBe('1000.51 : number');

        expect(hover(User)).toBe(dedent`
        User: {
          "name": "John Doe",
          "age": 28,
          "birthday": null,
          "married": false,
          "balance": 1000.51,
          "address": {
            "email": [
              "john.doe@gmail.com"
            ]
          }
        }`);

        expect(hover(address)).toBe(dedent`
        address: {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);

        expect(hover(address.value)).toBe(dedent`
        {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);

        expect(hover(email)).toBe(dedent`
        email: [
          "john.doe@gmail.com"
        ]`);

        expect(hover(email.value)).toBe(dedent`
        [
          "john.doe@gmail.com"
        ]`);
    });
});
