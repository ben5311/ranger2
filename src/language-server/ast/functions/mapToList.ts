import dedent from 'dedent-js';

import * as ast from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { isListFunc } from '../core/list';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class MapToListCompanion extends FuncCompanion<ast.MapToList> {
    override valueGenerator(node: ast.MapToList): ValueGenerator | undefined {
        const sourceFunc = resolveReference(node.source);
        if (!isListFunc(sourceFunc)) {
            return undefined;
        }

        return new ValueGenerator((data) => {
            this.generator.getValue(sourceFunc); // Ensure that sourceFunc's index is computed

            const sourceIndex = this.generator.valueGenerators.get(sourceFunc)?.data.index;
            if (sourceIndex === undefined) {
                return undefined;
            }

            data.index = sourceIndex;

            return this.generator.getValue(node.list.values[sourceIndex]);
        });
    }

    override funcHover(node: ast.MapToList): FuncHover {
        const sourceRef = node.source.$cstNode?.text;
        const source = resolveReference(node.source);
        const firstSourceVal = isListFunc(source) ? source.list.values[0] : undefined;
        const firstTargetVal = node.list.values[0];

        let description = dedent`
            Evaluates the value of \`${sourceRef}\` and chooses based on the result from possible values \\
            on the right hand side.`;

        if (firstSourceVal && firstTargetVal) {
            description += dedent`
            \n
            For example, if \`${sourceRef}\` matches \`${firstSourceVal.$cstNode?.text}\`,
            \`${firstTargetVal.$cstNode?.text}\` is returned.`;
        }

        return { description };
    }
}
