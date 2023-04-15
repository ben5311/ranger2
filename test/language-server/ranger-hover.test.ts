import { describe, expect, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { RangerHoverProvider } from '../../src/language-server/ranger-hover';
import { services, validate } from '../../src/utils/test';

describe('RangerHoverProvider', () => {
    test('Hover Content', async () => {
        const hoverProvider = new RangerHoverProvider(services.Ranger);
        // @ts-ignore
        const hover = (node) => hoverProvider.getAstNodeHover(node);
        let { result } = await validate(`
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

        expect(hover(User)).toBe(
            'User: {"name":"John Doe","age":28,"birthday":null,"married":false,"balance":1000.51,"address":{"email":["john.doe@gmail.com"]}}',
        );
        expect(hover(name)).toBe('name: "John Doe"');
        expect(hover(age)).toBe('age: 28');
        expect(hover(birthday)).toBe('birthday: null');
        expect(hover(married)).toBe('married: false');
        expect(hover(balance)).toBe('balance: 1000.51');
        expect(hover(address)).toBe('address: {"email":["john.doe@gmail.com"]}');
        expect(hover(email)).toBe('email: ["john.doe@gmail.com"]');

        expect(hover(name.value)).toBe('"John Doe" : string');
        expect(hover(age.value)).toBe('28 : integer');
        expect(hover(birthday.value)).toBe('null');
        expect(hover(married.value)).toBe('false : boolean');
        expect(hover(balance.value)).toBe('1000.51 : float');
        expect(hover(address.value)).toBe('{"email":["john.doe@gmail.com"]}');
        expect(hover(email.value)).toBe('["john.doe@gmail.com"]');
    });
});
