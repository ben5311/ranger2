import {
    AstReflection,
    CodeActionProvider,
    IndexManager,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
} from 'langium';
import { CodeActionKind, Diagnostic } from 'vscode-languageserver';
import { CodeActionParams } from 'vscode-languageserver-protocol';
import { CodeAction, Command } from 'vscode-languageserver-types';

import { Issues } from './ranger-validator';

type ActionProviderFunction = (diagnostic: Diagnostic, document: LangiumDocument) => CodeAction;
const actionProviders: { [key: string]: ActionProviderFunction[] } = {};

export class RangerActionProvider implements CodeActionProvider {
    protected readonly reflection: AstReflection;
    protected readonly indexManager: IndexManager;

    constructor(services: LangiumServices) {
        this.reflection = services.shared.AstReflection;
        this.indexManager = services.shared.workspace.IndexManager;
    }

    getCodeActions(document: LangiumDocument, params: CodeActionParams): MaybePromise<Array<Command | CodeAction>> {
        const result: CodeAction[] = [];
        for (const diagnostic of params.context.diagnostics) {
            const issueCode = diagnostic.code || '';
            const providers = actionProviders[issueCode] || [];
            for (const provider of providers) {
                result.push(provider(diagnostic, document));
            }
        }
        return result;
    }

    @Fix(Issues.Entity_NameNotCapitalized.code)
    private makeUpperCase(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
        const range = {
            start: diagnostic.range.start,
            end: {
                line: diagnostic.range.start.line,
                character: diagnostic.range.start.character + 1,
            },
        };
        return {
            title: 'Change first letter to upper case',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: [
                        {
                            range,
                            newText: document.textDocument.getText(range).toUpperCase(),
                        },
                    ],
                },
            },
        };
    }
}

/**
 * Quick Fix Decorator
 */
function Fix(issueCode: string): any {
    return function (target: object, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
        (actionProviders[issueCode] = actionProviders[issueCode] || []).push(propertyDescriptor.value);
    };
}
