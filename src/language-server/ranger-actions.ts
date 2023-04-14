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

    @Fix(Issues.NameNotCapitalized.code)
    private makeUpperCase(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
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

    @Fix(Issues.FilePathWithBackslashes.code)
    private replaceWithForwardSlashes(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
        const range = diagnostic.range;
        const newText = document.textDocument.getText(range).replaceAll(/\\+/g, '/');
        return {
            title: 'Replace backslashes with forward slashes',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: { [document.textDocument.uri]: [{ range, newText }] },
            },
        };
    }

    @Fix(Issues.MapToList_NotBasedOnAListFunc.code)
    private convertTo_MapToObject(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
        return {
            title: 'Convert to map(=>{})',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: { [document.textDocument.uri]: [diagnostic.data.suggestedChange] },
            },
        };
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
}

/**
 * Quick Fix Decorator
 */
function Fix(issueCode: string): any {
    return function (target: object, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
        (actionProviders[issueCode] = actionProviders[issueCode] || []).push(propertyDescriptor.value);
    };
}
