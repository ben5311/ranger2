import RandExp from 'randexp';

import { Regex } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RegexCompanion extends FuncCompanion<Regex> {
    override valueGenerator(regex: Regex): ValueGenerator {
        const regexGenerator = new RandExp(regex.value);
        return new ValueGenerator(() => regexGenerator.gen());
    }

    override funcHover(regex: Regex): FuncHover {
        return {
            signature: `${regex.$cstNode?.text} : regex`,
            description: `Generates a random string that matches given [Regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions).`,
        };
    }
}
