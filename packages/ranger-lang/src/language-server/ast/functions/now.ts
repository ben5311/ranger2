import dedent from 'dedent-js';
import { DateTime } from 'luxon';

import { isNowFunc, NowFunc, TodayFunc } from '../../generated/ast';
import { duration } from '../core/duration';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class NowFuncCompanion extends FuncCompanion<NowFunc | TodayFunc> {
    override valueGenerator(func: NowFunc | TodayFunc): ValueGenerator {
        const plusDuration = duration(func.plusDuration);
        const minusDuration = duration(func.minusDuration);
        const dateTime = DateTime.utc().plus(plusDuration).minus(minusDuration);
        const dateString = isNowFunc(func) ? dateTime.toISO() : dateTime.toISODate();

        return new ValueGenerator(() => dateString);
    }

    override funcHover(func: NowFunc | TodayFunc): FuncHover {
        const dateType = isNowFunc(func) ? 'timestamp' : 'date';
        const isRelative = func.plusDuration || func.minusDuration;
        return {
            description: dedent`
            Retrieves the current ${dateType}${isRelative ? ' and adds the given duration' : ''}.

            It is determined once and remains constant throughout.`,
        };
    }
}
