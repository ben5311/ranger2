import dedent from 'dedent-js';

import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class TodayFuncCompanion extends FuncCompanion<ast.TodayFunc> {
    override valueGenerator(_node: ast.TodayFunc): ValueGenerator {
        const today = new Date().toISOString().substring(0, 10);
        return new ValueGenerator(() => today);
    }

    override funcHover(_node: ast.TodayFunc): FuncHover {
        return {
            description: dedent`
            Retrieves the current date.

            It is determined once and remains constant throughout.`,
        };
    }
}
