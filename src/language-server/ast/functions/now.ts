import dedent from 'dedent-js';

import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class NowFuncCompanion extends FuncCompanion<ast.NowFunc> {
    override valueGenerator(_node: ast.NowFunc): ValueGenerator {
        const now = new Date().toISOString();
        return new ValueGenerator(() => now);
    }

    override funcHover(_node: ast.NowFunc): FuncHover {
        return {
            description: dedent`
            Retrieves the current timestamp.

            It is determined once and remains constant throughout.`,
        };
    }
}
