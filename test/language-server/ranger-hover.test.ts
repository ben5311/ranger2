import dedent from 'dedent-js';
import { describe, expect, test } from 'vitest';

import { Obj } from '../../src/language-server/generated/ast';
import { generator } from '../../src/language-server/ranger-generator';
import { noHighlight, RangerHoverProvider } from '../../src/language-server/ranger-hover';
import { createTempFile, parse, services } from '../../src/utils/test';

const hoverProvider = new RangerHoverProvider(services);
// @ts-ignore
const hover = (node) => hoverProvider.getAstNodeHover(node, noHighlight);

describe('RangerHoverProvider', () => {
    test('Static Values', async () => {
        let { doc } = await parse(dedent`
        Entity User {
            name: "John Doe"
            age: 28
            birthday: null
            married: false
            balance: 1000.51
            address: {
                email: ["john.doe@gmail.com"]
            }
        }`);

        let User = doc.entities[0];
        let props = (User.value as Obj).properties;
        let [name, age, birthday, married, balance, address] = props;
        let email = (address.value as Obj).properties[0];

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
        expect(hover(name)).toBe('name: "John Doe"');
        expect(hover(age)).toBe('age: 28');
        expect(hover(birthday)).toBe('birthday: null');
        expect(hover(married)).toBe('married: false');
        expect(hover(balance)).toBe('balance: 1000.51');
        expect(hover(address)).toBe(dedent`
        address: {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);
        expect(hover(email)).toBe(dedent`
        email: [
          "john.doe@gmail.com"
        ]`);

        expect(hover(name.value)).toBe('"John Doe" : string');
        expect(hover(age.value)).toBe('28 : number');
        expect(hover(birthday.value)).toBe('null');
        expect(hover(married.value)).toBe('false : bool');
        expect(hover(balance.value)).toBe('1000.51 : number');
        expect(hover(address.value)).toBe(dedent`
        {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);
        expect(hover(email.value)).toBe(dedent`
        [
          "john.doe@gmail.com"
        ]`);
    });

    test('References', async () => {
        let { doc } = await parse(dedent`
        Entity User {
            name: "John Doe"
            age: 28
            address: {
                email: ["john.doe@gmail.com"]
            }
        }
        Entity References {
            user: User
            addr: User.address
            mail: User.address.email
        }`);

        let References = doc.entities[1];
        let props = (References.value as Obj).properties;
        let [user, addr, mail] = props;

        expect(hover(user)).toBe(dedent`
        user: {
          "name": "John Doe",
          "age": 28,
          "address": {
            "email": [
              "john.doe@gmail.com"
            ]
          }
        }`);
        expect(hover(user.value)).toBe(dedent`
        User: {
          "name": "John Doe",
          "age": 28,
          "address": {
            "email": [
              "john.doe@gmail.com"
            ]
          }
        }`);

        expect(hover(addr)).toBe(dedent`
        addr: {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);
        expect(hover(addr.value)).toBe(dedent`
        address: {
          "email": [
            "john.doe@gmail.com"
          ]
        }`);

        expect(hover(mail)).toBe(dedent`
        mail: [
          "john.doe@gmail.com"
        ]`);
        expect(hover(mail.value)).toBe(dedent`
        email: [
          "john.doe@gmail.com"
        ]`);
    });

    test('random()', async () => {
        let { doc } = await parse(dedent`
        Entity Customer {
            age: random(18..18)
            gender: random("male")
        }`);

        let Customer = doc.entities[0];
        let props = (Customer.value as Obj).properties;
        let [age, gender] = props;

        expect(hover(age)).toBe(`age: 18`);
        expect(hover(gender)).toBe(`gender: "male"`);

        expect(hover(age.value)).toBe(dedent`
        random(18..18)
        \n---\n
        Generates a random number between \`18\` and \`18\` (ends inclusive).

        Example: 18`);

        expect(hover(gender.value)).toBe(dedent`
        random("male")
        \n---\n
        Generates a random element of the provided arguments.

        Example: "male"`);
    });

    test('map()', async () => {
        let { doc } = await parse(dedent`
        Entity Customer {
            gender: random("male")
            firstname1: map(gender => ["Max"])
            firstname2: map(gender => {"male": "Max"})
        }`);

        let Customer = doc.entities[0];
        let props = (Customer.value as Obj).properties;
        let [G, firstname1, firstname2] = props;

        expect(hover(firstname1)).toBe(`firstname1: "Max"`);
        expect(hover(firstname2)).toBe(`firstname2: "Max"`);

        expect(hover(firstname1.value)).toBe(dedent`
        map(gender => ["Max"])
        \n---\n
        Evaluates the value of \`gender\` and chooses based on the result from possible values \\
        on the right hand side.

        For example, if \`gender\` matches \`"male"\`,
        \`"Max"\` is returned.

        Example: "Max"`);

        expect(hover(firstname2.value)).toBe(dedent`
        map(gender => {"male": "Max"})
        \n---\n
        Evaluates the value of \`gender\` and chooses based on the result from possible values \\
        on the right hand side.

        For example, if \`gender\` matches \`"male"\`,
        \`"Max"\` is returned.

        Example: "Max"`);
    });

    test('csv()', async () => {
        let csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
        let { doc } = await parse(dedent`
        Entity Customer {
            data: csv("${csvFile.name}", delimiter=",")
            first: data.first
        }`);

        let Customer = doc.entities[0];
        let [data, first] = (Customer.value as Obj).properties;

        expect(hover(data)).toBe(dedent`
        data: {
          "first": "1",
          "second": "2",
          "third": "3"
        }
        `);
        expect(hover(first)).toBe('first: "1"');
        expect(hover(first.value)).toBe('first: "1"');

        let signature = hover(data.value)?.replace(new RegExp(csvFile.name, 'g'), 'data.csv');
        expect(signature).toBe(dedent`
        csv("data.csv", delimiter=",")
        \n---\n
        Generates a random row of CSV file \`data.csv\`.

        Example: {
          "first": "1",
          "second": "2",
          "third": "3"
        }`);
    });

    test('sequence()', async () => {
        let { doc } = await parse(dedent`
        Entity Customer {
            num1: sequence(1)
            num2: sequence(11)
        }`);

        let Customer = doc.entities[0];
        let [num1, num2] = (Customer.value as Obj).properties;

        expect(hover(num1)).toBe('num1: 1');
        expect(hover(num2)).toBe('num2: 11');
        expect(hover(num1.value)).toBe(dedent`
        sequence(1)
        \n---\n
        Generates number sequence \`1, 2, 3, ...\`

        Example: 1`);
        expect(hover(num2.value)).toBe(dedent`
        sequence(11)
        \n---\n
        Generates number sequence \`11, 12, 13, ...\`

        Example: 11`);
    });

    test('uuid()', async () => {
        let { doc } = await parse(dedent`
        Entity Customer {
            id: uuid()
        }`);

        let Customer = doc.entities[0];
        let [uuid] = (Customer.value as Obj).properties;
        const uuidValue = generator.getValue(uuid);

        expect(hover(uuid)).toBe(`id: "${uuidValue}"`);
        expect(hover(uuid.value)).toBe(dedent`
        uuid()
        \n---\n
        Generates a random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier).

        Example: "${uuidValue}"`);
    });

    test('regex()', async () => {
        let { doc } = await parse(dedent`
        Entity Customer {
            iban: /DE\\d{20}/
        }`);

        let Customer = doc.entities[0];
        let [iban] = (Customer.value as Obj).properties;
        const ibanValue = generator.getValue(iban);

        expect(hover(iban)).toBe(`iban: "${ibanValue}"`);
        expect(hover(iban.value)).toBe(dedent`
        /DE\\d{20}/ : regex
        \n---\n
        Generates a random string that matches given [Regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions).

        Example: "${ibanValue}"`);
    });
});
