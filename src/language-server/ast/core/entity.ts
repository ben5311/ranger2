import { LangiumDocument, SemanticTokenAcceptor, ValidationAcceptor } from 'langium';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver';

import { Entity } from '../../generated/ast';
import { Issues } from '../../ranger-validator';
import { Check, Fix } from '../Companion';
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

    @Fix(Issues.NameNotCapitalized.code)
    makeUpperCase(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
        const start = diagnostic.range.start;
        const range = { start: start, end: { line: start.line, character: start.character + 1 } };
        const newText = document.textDocument.getText(range).toUpperCase();
        return {
            title: 'Change first letter to upper case',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: { [document.textDocument.uri]: [{ range, newText }] },
            },
        };
    }
}
