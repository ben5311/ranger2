import dedent from 'dedent-js';
import { ValidationAcceptor } from 'langium';
import { DateTime, DurationLikeObject } from 'luxon';

import { Duration, isNowFunc, NowFunc, TodayFunc, Value } from '../../generated/ast';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class NowFuncCompanion extends FuncCompanion<NowFunc | TodayFunc> {
    override valueGenerator(func: NowFunc | TodayFunc): ValueGenerator {
        const now = DateTime.utc();

        return new ValueGenerator(() => {
            const plusDuration = this.computeDuration(func.plusDuration);
            const minusDuration = this.computeDuration(func.minusDuration);
            const dateTime = now.plus(plusDuration).minus(minusDuration);
            const dateString = isNowFunc(func) ? dateTime.toISO() : dateTime.toISODate();

            return dateString;
        });
    }

    override funcHover(func: NowFunc | TodayFunc): FuncHover {
        const dateType = isNowFunc(func) ? 'timestamp' : 'date';
        const isRelative = func.plusDuration || func.minusDuration;
        return {
            description: dedent`
            Retrieves the current ${dateType}${isRelative ? ' and adds the given duration' : ''}.`,
        };
    }

    @Check
    hasValidDuration(func: NowFunc | TodayFunc, accept: ValidationAcceptor) {
        const issue = Issues.InvalidDuration;

        for (const duration of [func.plusDuration, func.minusDuration]) {
            if (!duration) continue;

            for (const unit of ['days', 'months', 'weeks', 'years'] as const) {
                const value = this.generator.getValue(duration[unit]);

                if (typeof value !== 'undefined' && typeof value !== 'number') {
                    accept('error', issue.msg, { node: duration, property: unit, code: issue.code });
                }
            }
        }
    }

    computeDuration(duration?: Duration): DurationLikeObject {
        return {
            days: this.getNumber(duration?.days),
            months: this.getNumber(duration?.months),
            weeks: this.getNumber(duration?.weeks),
            years: this.getNumber(duration?.years),
        };
    }

    private getNumber(value?: Value) {
        const val = this.generator.getValue(value) ?? 0;
        return typeof val === 'number' ? val : undefined;
    }
}
