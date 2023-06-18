import { randomUUID } from 'crypto';

import { UuidFunc } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class UuidFuncCompanion extends FuncCompanion<UuidFunc> {
    override valueGenerator(_func: UuidFunc): ValueGenerator {
        return new ValueGenerator(() => randomUUID());
    }

    override funcHover(_func: UuidFunc): FuncHover {
        return {
            description: `Generates a random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier).`,
        };
    }
}
