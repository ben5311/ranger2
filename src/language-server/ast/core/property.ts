import { SemanticTokenAcceptor } from 'langium';

import { Property } from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyCompanion extends Companion<Property> {
    override valueGenerator(_property: Property): ValueGenerator {
        throw 'Not implemented - Properties are resolved in Generator.getValue() method';
    }

    override hover(property: Property, highlight: CodeHighlighter): string | undefined {
        const name = property.name;
        const value = resolveReference(property.value);
        if (value) {
            let valueText = this.generator.getValueAsJson(value);
            return highlight(`${name}: ${valueText}`);
        }
        return undefined;
    }

    override highlight(property: Property, highlight: SemanticTokenAcceptor): void {
        highlight({ node: property, property: 'name', type: 'property' });
    }
}
