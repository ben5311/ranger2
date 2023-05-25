import * as ast from '../../generated/ast';
import { getPropertyName, resolveReference } from '../../ranger-scope';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyReferenceCompanion extends Companion<ast.PropertyReference> {
    override valueGenerator(_node: ast.PropertyReference): ValueGenerator {
        throw 'Not implemented - Properties and References are resolved in Generator.getValue() method';
    }

    override hover(node: ast.PropertyReference, highlight: CodeHighlighter): string | undefined {
        const resolved = resolveReference(node);
        if (resolved !== undefined) {
            let valueText = this.generator.getValueAsJson(resolved);
            return highlight(`${getPropertyName(node)}: ${valueText}`);
        }
        return undefined;
    }

    override highlight(): void {
        return;
    }
}
