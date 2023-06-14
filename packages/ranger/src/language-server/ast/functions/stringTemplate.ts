import template from 'art-template';
import dedent from 'dedent-js';
import { ValidationAcceptor } from 'langium';

import { Property, StringTemplate } from '../../generated/ast';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';
import { dictToMap } from './mapToDict';

/**
 * String Templates can be used to create a String from multiple values.
 * They can access all Properties within the current scope
 * and can accept additional parameters, such as num.
 *
 * @example
 * ```ranger
 * Entity Customer {
 *   firstname: "James"
 *   lastname: "Parker"
 *   email: f"{firstname}.{lastname}{num}@gmail.com", {"num": random(1..100)}
 * }
 * ```
 */
export class StringTemplateCompanion extends FuncCompanion<StringTemplate> {
    override valueGenerator(string: StringTemplate): ValueGenerator {
        const templateString = string.template;

        if (templateString === '') {
            return new ValueGenerator(() => '');
        }

        const renderTemplate = template.compile(templateString, { rules, imports: filters });
        const paramProxy = this.createParamProxy(string);

        return new ValueGenerator(() => {
            return renderTemplate(paramProxy);
        });
    }

    /**
     * Create the template parameter proxy.
     * Parameters are first searched in the params dictionary
     * and retrieved from the current scope if not found.
     */
    private createParamProxy(string: StringTemplate) {
        const params = dictToMap(string.params);
        const scope = this.scopeProvider.doGetScope(string);

        const getParam = (name: string) => {
            if (params.has(name)) {
                return this.generator.getValue(params.get(name));
            }

            const description = scope.getElement(name);
            const astNode = this.services.workspace.IndexAccess.loadAstNode(description);

            return this.generator.getValue(astNode as Property);
        };

        return new Proxy({}, { get: (_target, name: string, _receiver) => getParam(name) });
    }

    override funcHover(_string: StringTemplate): FuncHover {
        return {
            description: dedent`
            Generates a String by inserting values into a Template.

            - You can access all Properties in scope.
            - You can pass additional parameters via \`f"" % {}\` variant.
            - Complex expressions are possible, e.g. \`{a + b}\` or \`{a || b}\`.
            - Uses the [art-template](https://aui.github.io/art-template/docs/syntax.html) syntax.
            `,
        };
    }

    @Check
    noSyntaxErrors(string: StringTemplate, accept: ValidationAcceptor): void {
        const issue = Issues.TemplateSyntaxError;
        try {
            this.generator.getValue(string);
        } catch (error) {
            accept('error', String(error), { node: string, property: 'template', code: issue.code });
        }
    }
}

const rules = [
    ...template.defaults.rules,
    {
        ...template.defaults.rules[1],
        test: /{([@#]?)[ \t]*(\/?)([\w\W]*?)[ \t]*}/,
    },
];

const filters = {
    ascii: (value: any) =>
        String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
    lower: (value: any) => String(value).toLocaleLowerCase(),
    upper: (value: any) => String(value).toLocaleUpperCase(),
};
