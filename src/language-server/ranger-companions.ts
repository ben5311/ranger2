import { AstNode } from 'langium';

import { Companion } from './ast/Companion';
import { EntityCompanion } from './ast/core/entity';
import { ListCompanion } from './ast/core/list';
import { LiteralCompanion } from './ast/core/literal';
import { ObjektCompanion } from './ast/core/objekt';
import { PropertyCompanion } from './ast/core/property';
import { PropertyExtractorCompanion } from './ast/core/propertyExtractor';
import { PropertyReferenceCompanion } from './ast/core/propertyReference';
import { CsvFuncCompanion } from './ast/functions/csv';
import { MapToDictCompanion } from './ast/functions/mapToDict';
import { MapToListCompanion } from './ast/functions/mapToList';
import { NowFuncCompanion } from './ast/functions/now';
import { RandomOfListCompanion } from './ast/functions/randomOfList';
import { RandomOfRangeCompanion } from './ast/functions/randomOfRange';
import { RegexCompanion } from './ast/functions/regex';
import { SequenceFuncCompanion } from './ast/functions/sequence';
import { TodayFuncCompanion } from './ast/functions/today';
import { UuidFuncCompanion } from './ast/functions/uuid';
import { RangerAstType } from './generated/ast';
import { RangerServices } from './ranger-module';

class NoOpCompanion extends Companion<AstNode> {
    valueGenerator = () => undefined;
    hover = () => undefined;
    highlight = () => undefined;
}

type CompanionClass = new (...args: any[]) => Companion<any>;

export const companionRegistry: { [type in keyof RangerAstType]: CompanionClass } = {
    Entity: EntityCompanion,
    List: ListCompanion,
    Literal: LiteralCompanion,
    Objekt: ObjektCompanion,
    Property: PropertyCompanion,
    PropertyExtractor: PropertyExtractorCompanion,
    PropertyReference: PropertyReferenceCompanion,
    // Literals
    ANumber: LiteralCompanion,
    ABoolean: LiteralCompanion,
    AString: LiteralCompanion,
    ADate: LiteralCompanion,
    ATimestamp: LiteralCompanion,
    AFilePath: LiteralCompanion,
    ANull: LiteralCompanion,
    // Functions
    CsvFunc: CsvFuncCompanion,
    MapToDict: MapToDictCompanion,
    MapToList: MapToListCompanion,
    NowFunc: NowFuncCompanion,
    RandomOfList: RandomOfListCompanion,
    RandomOfRange: RandomOfRangeCompanion,
    Regex: RegexCompanion,
    SequenceFunc: SequenceFuncCompanion,
    TodayFunc: TodayFuncCompanion,
    UuidFunc: UuidFuncCompanion,
    // No op
    Document: NoOpCompanion,
    Import: NoOpCompanion,
    Value: NoOpCompanion,
    ValueOrPropertyReference: NoOpCompanion,
    Func: NoOpCompanion,
    MapFunc: NoOpCompanion,
    RandomFunc: NoOpCompanion,
    Range: NoOpCompanion,
    Dictionary: NoOpCompanion,
    KeyValuePair: NoOpCompanion,
};

export class RangerCompanions {
    companions: { [key: string]: Companion<any> } = {};

    constructor(services: RangerServices) {
        for (const [key, Companion] of Object.entries(companionRegistry)) {
            this.companions[key] = new Companion(services);
        }
    }

    get(node: AstNode): Companion<AstNode> {
        return this.companions[node.$type];
    }
}
