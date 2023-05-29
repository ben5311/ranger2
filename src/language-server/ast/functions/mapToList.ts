import dedent from 'dedent-js';
import { ValidationAcceptor } from 'langium';

import { MapToList } from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { isListFunc } from '../core/list';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class MapToListCompanion extends FuncCompanion<MapToList> {
    override valueGenerator(mapFunc: MapToList): ValueGenerator | undefined {
        const sourceFunc = resolveReference(mapFunc.source);
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

            return this.generator.getValue(mapFunc.list.values[sourceIndex]);
        });
    }

    override funcHover(mapFunc: MapToList): FuncHover {
        const sourceRef = mapFunc.source.$cstNode?.text;
        const source = resolveReference(mapFunc.source);
        const firstSourceVal = isListFunc(source) ? source.list.values.first() : undefined;
        const firstTargetVal = mapFunc.list.values.first();

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

    @Check
    isBasedOnAListFunc(mapFunc: MapToList, accept: ValidationAcceptor): void {
        const issue = Issues.MapToList_NotBasedOnAListFunc;
        const sourceValue = resolveReference(mapFunc.source);
        if (!isListFunc(sourceValue)) {
            accept('error', issue.msg, {
                node: mapFunc,
                property: 'source',
                code: issue.code,
                data: {
                    suggestedChange: {
                        range: mapFunc.list.$cstNode?.range,
                        newText:
                            '{' +
                            mapFunc.list.values.map((val, i) => `"val${i}": ${val.$cstNode?.text}`).join(', ') +
                            '}',
                    },
                },
            });
        }
    }
}
