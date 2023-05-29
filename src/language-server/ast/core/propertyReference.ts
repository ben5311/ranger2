import { ValidationAcceptor } from 'langium';

import { PropertyReference } from '../../generated/ast';
import { getPropertyName, resolveReference } from '../../ranger-scope';
import { Issues } from '../../ranger-validator';
import { CodeHighlighter } from '../CodeHighlighter';
import { Check, Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyReferenceCompanion extends Companion<PropertyReference> {
    override valueGenerator(_propRef: PropertyReference): ValueGenerator {
        throw 'Not implemented - Properties and References are resolved in Generator.getValue() method';
    }

    override hover(propRef: PropertyReference, highlight: CodeHighlighter): string | undefined {
        const resolved = resolveReference(propRef);
        if (resolved !== undefined) {
            let valueText = this.generator.getValueAsJson(resolved);
            return highlight(`${getPropertyName(propRef)}: ${valueText}`);
        }
        return undefined;
    }

    override highlight(): void {
        return;
    }

    @Check
    noCircularReference(propRef: PropertyReference, accept: ValidationAcceptor): void {
        const issue = Issues.CircularReference;
        resolveReference(propRef, (_) => {
            accept('error', issue.msg, { node: propRef, code: issue.code });
        });
    }
}
