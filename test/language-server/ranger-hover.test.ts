import dedent from 'dedent-js';
import { describe, expect, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { noHighlight, RangerHoverProvider } from '../../src/language-server/ranger-hover';
import { services, validate } from '../../src/utils/test';

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
            name: "John Doe"
            age: 28
            birthday: null
            married: false
            balance: 1000.51
            address: {
                email: ["john.doe@gmail.com"]
            }
        }`);
        expect(hover(name)).toBe('name: "John Doe"');
        expect(hover(age)).toBe('age: 28');
        expect(hover(birthday)).toBe('birthday: null');
        expect(hover(married)).toBe('married: false');
        expect(hover(balance)).toBe('balance: 1000.51');
        expect(hover(address)).toBe(`address: {\n    email: ["john.doe@gmail.com"]\n}`);
        expect(hover(email)).toBe('email: ["john.doe@gmail.com"]');

        expect(hover(name.value)).toBe('"John Doe" : string');
        expect(hover(age.value)).toBe('28 : integer');
        expect(hover(birthday.value)).toBe('null');
        expect(hover(married.value)).toBe('false : boolean');
        expect(hover(balance.value)).toBe('1000.51 : float');
        expect(hover(address.value)).toBe(`{\n    email: ["john.doe@gmail.com"]\n}`);
        expect(hover(email.value)).toBe('["john.doe@gmail.com"]');
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
            name: "John Doe"
            age: 28
            address: {
                email: ["john.doe@gmail.com"]
            }
        }`);
        expect(hover(user.value)).toBe(dedent`
        User: {
            name: "John Doe"
            age: 28
            address: {
                email: ["john.doe@gmail.com"]
            }
        }`);

        expect(hover(addr)).toBe(dedent`
        addr: {
            email: ["john.doe@gmail.com"]
        }`);
        expect(hover(addr.value)).toBe(dedent`
        address: {
            email: ["john.doe@gmail.com"]
        }`);

        expect(hover(mail)).toBe(`mail: ["john.doe@gmail.com"]`);
        expect(hover(mail.value)).toBe(`email: ["john.doe@gmail.com"]`);
    });

    test('RandomFunc', async () => {
        let { result } = await validate(dedent`
        Entity Customer {
            age: random(18..60)
            gender: random("male", "female")
        }`);

        let Customer = result.entities[0];
        let props = (Customer.value as Objekt).properties;
        let [age, gender] = props;

        expect(hover(age)).toBe(`age: random(18..60)`);
        expect(hover(gender)).toBe(`gender: random("male", "female")`);

        expect(hover(age.value)).toBe(dedent`
        random(18..60)\n
        ---\n
        Generates a random number between \`18\` and \`60\` (ends inclusive).`);

        expect(hover(gender.value)).toBe(dedent`
        random("male", "female")\n
        ---\n
        Generates a random element of the provided arguments.`);
    });

    test('MapFunc', async () => {
        let { result } = await validate(dedent`
        Entity Customer {
            gender: random("male", "female")
            firstname1: map(gender => ["Max", "Anna"])
            firstname2: map(gender => {"male": "Max", "female": "Anna"})
        }`);

        let Customer = result.entities[0];
        let props = (Customer.value as Objekt).properties;
        let [G, firstname1, firstname2] = props;

        expect(hover(firstname1)).toBe(`firstname1: map(gender => ["Max", "Anna"])`);
        expect(hover(firstname2)).toBe(`firstname2: map(gender => {"male": "Max", "female": "Anna"})`);

        expect(hover(firstname1.value)).toBe(dedent`
        map(gender => ["Max", "Anna"])\n
        ---\n
        Generates a random number between (ends inclusive).`);

        //expect(hover(firstname2.value)).toBe(dedent``);
    });

    test('CsvFunc', async () => {
        let { result } = await validate(dedent`
        Entity Customer {
            bank: csv("bank.csv")
        }`);

        let Customer = result.entities[0];
        let bank = (Customer.value as Objekt).properties[0];

        expect(hover(bank)).toBe(`bank: csv("bank.csv")`);
        expect(hover(bank.value)).toBe(dedent`
        csv("bank.csv", delimiter="undefined")\n
        ---\n
        Generates a row of CSV file \`bank.csv\`.\n
        Detected columns: []\n
        Sample row: {}`);
    });
});
