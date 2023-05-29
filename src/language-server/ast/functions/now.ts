import dedent from 'dedent-js';

import { NowFunc } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class NowFuncCompanion extends FuncCompanion<NowFunc> {
    override valueGenerator(_func: NowFunc): ValueGenerator {
        const now = new Date().toISOString();
        return new ValueGenerator(() => now);
    }

    override funcHover(_func: NowFunc): FuncHover {
        return {
            description: dedent`
            Retrieves the current timestamp.

            It is determined once and remains constant throughout.`,
        };
    }
}
