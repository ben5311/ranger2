import RandExp from 'randexp';

import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RegexCompanion extends FuncCompanion<ast.Regex> {
    override valueGenerator(node: ast.Regex): ValueGenerator {
        const regexGenerator = new RandExp(node.value);
        return new ValueGenerator(() => regexGenerator.gen());
    }

    override funcHover(node: ast.Regex): FuncHover {
        return {
            signature: `${node.$cstNode?.text} : regex`,
            description: `Generates a random string that matches given [Regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions).`,
        };
    }
}
