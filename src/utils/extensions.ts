export {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Extension methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

declare global {
    interface Array<T> {
        first(): T | undefined;
        groupBy<KeyT>(this: T[], key: (element: T) => KeyT): Map<KeyT, T[]>;
        last(index?: number): T | undefined;
        lastIndex(): number;
        isEmpty(): boolean;
        notEmpty(): boolean;
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

Set.prototype.toArray = function () {
    return Array.from(this.values());
};

Map.prototype.valuesArray = function () {
    return Array.from(this.values());
};
