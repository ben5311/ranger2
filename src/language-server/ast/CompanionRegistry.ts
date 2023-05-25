import { AstNode } from 'langium';

import * as ast from '../generated/ast';
import { Generator } from '../ranger-generator';
import { Companion } from './Companion';
import { EntityCompanion } from './core/entity';
import { ListCompanion } from './core/list';
import { LiteralCompanion } from './core/literal';
import { ObjektCompanion } from './core/objekt';
import { PropertyCompanion } from './core/property';
import { PropertyExtractorCompanion } from './core/propertyExtractor';
import { PropertyReferenceCompanion } from './core/propertyReference';
import { CsvFuncCompanion } from './functions/csv';
import { MapToDictCompanion } from './functions/mapToDict';
import { MapToListCompanion } from './functions/mapToList';
import { NowFuncCompanion } from './functions/now';
import { RandomOfListCompanion } from './functions/randomOfList';
import { RandomOfRangeCompanion } from './functions/randomOfRange';
import { RegexCompanion } from './functions/regex';
import { SequenceFuncCompanion } from './functions/sequence';
import { TodayFuncCompanion } from './functions/today';
import { UuidFuncCompanion } from './functions/uuid';

const registry: { [key in keyof ast.RangerAstType]?: new (...args: any[]) => any } = {
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
};

export type Companions = { get(node: AstNode): Companion<AstNode> | undefined };

export function createCompanions(generator: Generator): Companions {
    const companions: { [key: string]: Companion<any> } = {};

    for (const [key, Companion] of Object.entries(registry)) {
        companions[key] = new Companion(generator);
    }

    return {
        get(node: AstNode) {
            return companions[node.$type];
        },
    };
}
