import { AstNode, SemanticTokenAcceptor } from 'langium';

import * as ast from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { CodeHighlighter } from '../CodeHighlighter';
import { TypeCompanion } from '../TypeCompanion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyCompanion extends TypeCompanion<ast.Property> {
    override valueGenerator(_node: ast.Property): ValueGenerator {
        throw 'Not implemented - Properties and References are resolved in Generator.getValue() method';
    }

    override hover(node: ast.Property, highlight: CodeHighlighter): string | undefined {
        const name = node.name;
        const value = resolveReference(node.value);
        if (value) {
            let valueText = this.generator.getValueAsJson(value);
            return highlight(`${name}: ${valueText}`);
        }
        return undefined;
    }

    override highlight(node: ast.Property, highlight: SemanticTokenAcceptor): void {
        highlight({ node, property: 'name', type: 'property' });
    }
}
