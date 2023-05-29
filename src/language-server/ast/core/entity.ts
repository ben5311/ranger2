import { SemanticTokenAcceptor, ValidationAcceptor } from 'langium';

import { Entity } from '../../generated/ast';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { PropertyCompanion } from './property';

export class EntityCompanion extends PropertyCompanion {
    override highlight(entity: Entity, highlight: SemanticTokenAcceptor): void {
        highlight({ node: entity, keyword: 'Entity', type: 'keyword' });
    }

    @Check
    nameStartsWithCapital(entity: Entity, accept: ValidationAcceptor) {
        if (entity.name) {
            const issue = Issues.NameNotCapitalized;
            const firstChar = entity.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', issue.msg, { node: entity, property: 'name', code: issue.code });
            }
        }
    }
}
