import { ValidationAcceptor } from 'langium';

import { MapFunc } from '../../generated/ast';
import { resolveReference } from '../../ranger-scope';
import { Issues } from '../../ranger-validator';
import { Check, NoOpCompanion } from '../Companion';

export class MapFuncCompanion extends NoOpCompanion {
    @Check
    noCircularReference(mapFunc: MapFunc, accept: ValidationAcceptor): void {
        const issue = Issues.CircularReference;
        if (mapFunc === resolveReference(mapFunc.source)) {
            accept('error', issue.msg, { node: mapFunc, property: 'source', code: issue.code });
        }
    }
}
