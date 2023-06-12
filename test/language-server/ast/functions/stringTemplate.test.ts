import dedent from 'dedent-js';
import { describe, expect, test } from 'vitest';

import { Issues } from '../../../../src/language-server/ranger-validator';
import { createObjectGenerator, expectError, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('f""', () => {
    const document = `
    Entity Test {
        firstname: "James"
        lastname: "Parker"
        email: f"{firstname}.{lastname}@gmail.com"
        uname: f"{firstname}{number}" % {"number": random(99..99)}
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        const output = generator.next();

        expect(output.email).toBe('James.Parker@gmail.com');
        expect(output.uname).toBe('James99');
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [_firstname, _lastname, email, uname] = properties(doc);

        expect(hover(email)).toBe('email: "James.Parker@gmail.com"');
        expect(hover(uname)).toBe('uname: "James99"');

        expect(hover(email.value)).toBe(dedent`
        f"{firstname}.{lastname}@gmail.com"
        \n---\n
        Generates a String by inserting values into a Template.

        - You can access all Properties in scope.
        - You can pass additional parameters via \`f"" % {}\` variant.
        - Complex expressions are possible, e.g. \`{a + b}\` or \`{a || b}\`.
        - Uses the [art-template](https://aui.github.io/art-template/docs/syntax.html) syntax.

        Example: "James.Parker@gmail.com"
        `);
    });

    describe('Validate', () => {
        test('NoSyntaxError ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                firstname: "James"
                lastname: "Parker"
                email: f"{firstname.{lastname}@gmail.com"
            }`);

            expectError(document, Issues.TemplateSyntaxError.code, {
                node: properties(document)[2].value,
                property: 'template',
            });
        });
    });
});
