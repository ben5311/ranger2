import { date } from '../../../utils/time';
import { isRandomDate, RandomDate, RandomTimestamp } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomDateCompanion extends FuncCompanion<RandomDate | RandomTimestamp> {
    override valueGenerator(func: RandomDate | RandomTimestamp): ValueGenerator | undefined {
        const [min, max] = this.resolveMinMax(func);
        const minEpochTime = date(min).getTime();
        const maxEpochTime = date(max).getTime();

        return new ValueGenerator(() => {
            const randomEpochTime = this.generator.random.integer(minEpochTime, maxEpochTime);
            const randomDate = new Date(randomEpochTime);

            if (isRandomDate(func)) {
                return randomDate.isoDate();
            } else {
                return randomDate.isoTimestamp();
            }
        });
    }

    override funcHover(func: RandomDate | RandomTimestamp): FuncHover {
        const [min, max] = this.resolveMinMax(func);
        const type = isRandomDate(func) ? 'date' : 'timestamp';
        return {
            description: `Generates a random ${type} between \`"${min}"\` and \`"${max}"\` (ends inclusive).`,
        };
    }

    private resolveMinMax(func: RandomDate | RandomTimestamp) {
        const min = this.generator.getValue(func.min) as string;
        const max = this.generator.getValue(func.max) as string;
        return [min, max];
    }
}
