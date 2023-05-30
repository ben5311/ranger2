import { AstNode } from 'langium';

import { Companion, NoOpCompanion } from './ast/Companion';
import { DocumentCompanion } from './ast/core/document';
import { EntityCompanion } from './ast/core/entity';
import { FilePathCompanion } from './ast/core/filePath';
import { ImportCompanion } from './ast/core/import';
import { ListCompanion } from './ast/core/list';
import { LiteralCompanion } from './ast/core/literal';
import { ObjektCompanion } from './ast/core/objekt';
import { PropertyCompanion } from './ast/core/property';
import { PropertyExtractorCompanion } from './ast/core/propertyExtractor';
import { PropertyReferenceCompanion } from './ast/core/propertyReference';
import { CsvFuncCompanion } from './ast/functions/csv';
import { MapFuncCompanion } from './ast/functions/map';
import { MapToDictCompanion } from './ast/functions/mapToDict';
import { MapToListCompanion } from './ast/functions/mapToList';
import { NowFuncCompanion } from './ast/functions/now';
import { RandomDateCompanion } from './ast/functions/randomDate';
import { RandomNumberCompanion } from './ast/functions/randomNumber';
import { RandomOfListCompanion } from './ast/functions/randomOfList';
import { RegexCompanion } from './ast/functions/regex';
import { SequenceFuncCompanion } from './ast/functions/sequence';
import { TodayFuncCompanion } from './ast/functions/today';
import { UuidFuncCompanion } from './ast/functions/uuid';
import { RangerAstType } from './generated/ast';
import { RangerServices } from './ranger-module';

type CompanionClass = new (...args: any[]) => Companion<any>;

export const companionRegistry: { [type in keyof RangerAstType]: CompanionClass } = {
    Document: DocumentCompanion,
    Import: ImportCompanion,
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
    AFilePath: FilePathCompanion,
    ANull: LiteralCompanion,
    // Functions
    CsvFunc: CsvFuncCompanion,
    MapFunc: MapFuncCompanion,
    MapToDict: MapToDictCompanion,
    MapToList: MapToListCompanion,
    NowFunc: NowFuncCompanion,
    RandomNumber: RandomNumberCompanion,
    RandomDate: RandomDateCompanion,
    RandomTimestamp: RandomDateCompanion,
    RandomOfList: RandomOfListCompanion,
    Regex: RegexCompanion,
    SequenceFunc: SequenceFuncCompanion,
    TodayFunc: TodayFuncCompanion,
    UuidFunc: UuidFuncCompanion,
    // Other
    Value: NoOpCompanion,
    ValueOrPropertyReference: NoOpCompanion,
    Func: NoOpCompanion,
    RandomFunc: NoOpCompanion,
    Dictionary: NoOpCompanion,
    KeyValuePair: NoOpCompanion,
};

export class RangerCompanions {
    companions = new Map<string, Companion<any>>();

    constructor(services: RangerServices) {
        for (const [type, Companion] of Object.entries(companionRegistry)) {
            this.companions.set(type, new Companion(services));
        }
    }

    get(node: AstNode): Companion<AstNode> {
        return this.companions.get(node.$type)!;
    }
}
