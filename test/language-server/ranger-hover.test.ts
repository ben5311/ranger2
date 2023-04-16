import dedent from 'dedent-js';
import { describe, expect, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { noHighlight, RangerHoverProvider } from '../../src/language-server/ranger-hover';
import { createTempFile, escapePath, services, validate } from '../../src/utils/test';

const hoverProvider = new RangerHoverProvider(services.Ranger);
// @ts-ignore
const hover = (node) => hoverProvider.getAstNodeHover(node, noHighlight);

describe('RangerHoverProvider', () => {
    test('Static Values', async () => {
        let { result } = await validate(dedent`
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

        let User = result.entities[0];
        let props = (User.value as Objekt).properties;
        let [name, age, birthday, married, balance, address] = props;
        let email = (address.value as Objekt).properties[0];

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
        expect(hover(age.value)).toBe('28 : integer');
        expect(hover(birthday.value)).toBe('null');
        expect(hover(married.value)).toBe('false : boolean');
        expect(hover(balance.value)).toBe('1000.51 : float');
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
        let { result } = await validate(dedent`
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

        let References = result.entities[1];
        let props = (References.value as Objekt).properties;
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

    test('RandomFunc', async () => {
        let { result } = await validate(dedent`
        Entity Customer {
            age: random(18..18)
            gender: random("male")
        }`);

        let Customer = result.entities[0];
        let props = (Customer.value as Objekt).properties;
        let [age, gender] = props;

        expect(hover(age)).toBe(`age: 18`);
        expect(hover(gender)).toBe(`gender: "male"`);

        expect(hover(age.value)).toBe(dedent`
        random(18..18)\n
        ---\n
        Generates a random number between \`18\` and \`18\` (ends inclusive).`);

        expect(hover(gender.value)).toBe(dedent`
        random("male")\n
        ---\n
        Generates a random element of the provided arguments.`);
    });

    test('MapFunc', async () => {
        let { result } = await validate(dedent`
        Entity Customer {
            gender: random("male")
            firstname1: map(gender => ["Max"])
            firstname2: map(gender => {"male": "Max"})
        }`);

        let Customer = result.entities[0];
        let props = (Customer.value as Objekt).properties;
        let [G, firstname1, firstname2] = props;

        expect(hover(firstname1)).toBe(`firstname1: "Max"`);
        expect(hover(firstname2)).toBe(`firstname2: "Max"`);

        expect(hover(firstname1.value)).toBe(dedent`
        map(gender => ["Max"])\n
        ---\n
        Generates a random number between (ends inclusive).`);

        //expect(hover(firstname2.value)).toBe(dedent``);
    });

    test('CsvFunc', async () => {
        let csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
        let filePath = escapePath(csvFile.name);
        let { result } = await validate(dedent`
        Entity Customer {
            data: csv("${filePath}", delimiter=",")
        }`);

        let Customer = result.entities[0];
        let data = (Customer.value as Objekt).properties[0];

        expect(hover(data)).toBe(dedent`
        data: {
          "first": "1",
          "second": "2",
          "third": "3"
        }
        `);
        let signature = hover(data.value)?.replace(new RegExp(filePath, 'g'), 'data.csv');
        expect(signature).toBe(dedent`
        csv("data.csv", delimiter=",")\n
        ---\n
        Generates a row of CSV file \`data.csv\`.\n
        Detected columns: []\n
        Sample row: {}`);
    });
});
