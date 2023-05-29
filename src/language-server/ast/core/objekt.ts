import { AstNode, getDocument, streamAllContents, ValidationAcceptor } from 'langium';

import { findDuplicates } from '../../../utils/collections';
import { DynamicObject } from '../../../utils/types';
import { isObjekt, isPropertyReference, Objekt } from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { Issues } from '../../ranger-validator';
import { CodeHighlighter } from '../CodeHighlighter';
import { Check, Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class ObjektCompanion extends Companion<Objekt> {
    seen = new Set<string>();

    override valueGenerator(object: Objekt): ValueGenerator {
        return new ValueGenerator(() => {
            let result: DynamicObject = {};
            for (let prop of object.properties) {
                result[prop.name] = this.generator.getValue(prop.value);
            }
            return result;
        });
    }

    override hover(object: Objekt, highlight: CodeHighlighter): string | undefined {
        return highlight(this.generator.getValueAsJson(object));
    }

    override highlight(): void {
        return;
    }

    @Check
    noDuplicateProperties(object: Objekt, accept: ValidationAcceptor): void {
        const issue = Issues.DuplicateProperty;
        const duplicates = findDuplicates(object.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg}: '${dup.name}'`, { node: dup, property: 'name', code: issue.code });
        }
    }

    @Check
    noReferenceToParentObject(object: Objekt, accept: ValidationAcceptor) {
        this.doCheckNoReferenceToParent(object, object, accept);
    }

    doCheckNoReferenceToParent(parent: Objekt, current: Objekt, accept: ValidationAcceptor, node?: AstNode) {
        for (const ref of streamAllContents(current)
            .filter(isPropertyReference)
            .filter((ref) => ref.$containerProperty !== 'previous')) {
            const resolved = resolveReference(ref);

            if (resolved === parent) {
                accept('error', Issues.CircularReference.msg, {
                    node: node || ref,
                    code: Issues.CircularReference.code,
                });
            } else if (isObjekt(resolved)) {
                const refId = `${getDocument(current).uri.fsPath} - ${ref.$cstNode?.text}`;
                if (this.seen.has(refId)) {
                    return;
                }

                this.seen.add(refId);
                this.doCheckNoReferenceToParent(parent, resolved, accept, node || ref);
                this.seen.delete(refId);
            }
        }
    }
}
