import { randomUUID } from 'crypto';

import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class UuidFuncCompanion extends FuncCompanion<ast.UuidFunc> {
    override valueGenerator(_node: ast.UuidFunc): ValueGenerator {
        return new ValueGenerator(() => randomUUID());
    }

    override funcHover(_node: ast.UuidFunc): FuncHover {
        return {
            description: `Generates a random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier).`,
        };
    }
}
