import dedent from 'dedent-js';

import { MapToDict } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class MapToDictCompanion extends FuncCompanion<MapToDict> {
    override valueGenerator(mapFunc: MapToDict): ValueGenerator {
        const map = new Map();

        for (let pair of mapFunc.dictionary.pairs) {
            const key = this.generator.getValue(pair.key);
            const value = pair.value;
            map.set(key, value);
        }

        return new ValueGenerator(() => {
            const source = this.generator.getValue(mapFunc.source);
            const target = map.get(source);
            return this.generator.getValue(target);
        });
    }

    override funcHover(mapFunc: MapToDict): FuncHover {
        const sourceRef = mapFunc.source.$cstNode?.text;
        const firstPair = mapFunc.dictionary.pairs[0];

        let description = dedent`
            Evaluates the value of \`${sourceRef}\` and chooses based on the result from possible values \\
            on the right hand side.`;

        if (firstPair) {
            description += dedent`
            \n
            For example, if \`${sourceRef}\` matches \`${firstPair.key.$cstNode?.text}\`,
            \`${firstPair.value.$cstNode?.text}\` is returned.`;
        }

        return { description };
    }
}
