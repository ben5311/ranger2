export {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Extension methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

declare global {
    interface Array<T> {
        first(): T | undefined;
        groupBy<KeyT>(this: T[], key: (element: T) => KeyT): Map<KeyT, T[]>;
        sum(): number;
        last(index?: number): T | undefined;
        lastIndex(): number;
        isEmpty(): boolean;
        notEmpty(): boolean;
        nonNull(): Array<T>;
    }
    interface Set<T> {
        toArray(): T[];
    }
    interface Map<K, V> {
        valuesArray(): V[];
    }
}

Array.prototype.first = function () {
    return this.length >= 1 ? this[0] : undefined;
};
Array.prototype.groupBy = function (keyFn) {
    return this.reduce(function (accumulator: Map<any, any[]>, currentVal) {
        let key = keyFn(currentVal);
        if (!accumulator.get(key)) {
            accumulator.set(key, []);
        }
        accumulator.get(key)!.push(currentVal);
        return accumulator;
    }, new Map<any, any[]>());
};
Array.prototype.sum = function () {
    return this.reduce((previous, current) => previous + current, 0);
};
Array.prototype.last = function (index = 0) {
    return this[this.lastIndex() - index];
};
Array.prototype.lastIndex = function () {
    return this.length - 1;
};
Array.prototype.isEmpty = function () {
    return this.length == 0;
};
Array.prototype.notEmpty = function () {
    return !this.isEmpty();
};
Array.prototype.nonNull = function () {
    return this.filter((el) => el !== null && el !== undefined);
};

Set.prototype.toArray = function () {
    return Array.from(this.values());
};

Map.prototype.valuesArray = function () {
    return Array.from(this.values());
};

export function findDuplicates<T extends { name: string }>(elements: T[], includeFirst = true): T[] {
    return elements
        .groupBy((el) => el.name)
        .valuesArray()
        .filter((arr) => arr.length >= 2)
        .map((arr) => arr.slice(includeFirst ? 0 : 1))
        .flat();
}
