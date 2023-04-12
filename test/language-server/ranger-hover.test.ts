import { NodeFileSystem } from 'langium/node';
import { describe, expect, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { RangerHoverProvider } from '../../src/language-server/ranger-hover';
import { createRangerServices } from '../../src/language-server/ranger-module';
import { validate } from '../../src/utils/test';

describe('RangerHoverProvider', () => {
    test('Hover Content', async () => {
        const services = createRangerServices(NodeFileSystem);
        const hoverProvider = new RangerHoverProvider(services.Ranger);
        // @ts-ignore
        const hover = (node) => hoverProvider.getAstNodeHoverContent(node).contents.value;
        let { result } = await validate(`
        Entity User {
            name: "John Doe"
            age: 28
            married: false
            address: {
                phone: null
                email: "john.doe@gmail.com"
            }
        }`);

        let User = result.entities[0];
        let props = (User.value as Objekt).properties;
        let name = props[0];
        let age = props[1];
        let married = props[2];
        let address = props[3];
        let phone = (props[3].value as Objekt).properties[0];

        expect(hover(User)).toBe(
            'User: {"name":"John Doe","age":28,"married":false,"address":{"phone":null,"email":"john.doe@gmail.com"}}',
        );
        expect(hover(name)).toBe('name: "John Doe"');
        expect(hover(age)).toBe('age: 28');
        expect(hover(married)).toBe('married: false');
        expect(hover(address)).toBe('address: {"phone":null,"email":"john.doe@gmail.com"}');
        expect(hover(phone)).toBe('phone: null');
    });
});
