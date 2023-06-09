import { DynamicObject } from '../../utils/types';

export class ValueGenerator {
    data: DynamicObject = {};

    constructor(protected _nextValue: (data: any) => unknown = () => undefined) {}

    nextValue(): unknown {
        return this._nextValue(this.data);
    }
}
