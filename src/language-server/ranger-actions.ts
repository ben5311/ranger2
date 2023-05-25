import {
    AstReflection,
    CodeActionProvider,
    IndexManager,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
} from 'langium';
import { CodeActionKind, CodeActionParams, Diagnostic } from 'vscode-languageserver';
import { CodeAction, Command } from 'vscode-languageserver-types';

import { Document } from './generated/ast';
import { resolveRelativePath } from './ranger-documents';
import { Issues } from './ranger-validator';

type ActionProviderFunction = (diagnostic: Diagnostic, document: LangiumDocument) => CodeAction | CodeAction[];
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

    @Fix(Issues.ReferenceError.code)
    private suggestImport(diagnostic: Diagnostic, document: LangiumDocument): CodeAction[] {
        const lastImportOffset = (document.parseResult.value as Document).imports.last()?.$cstNode?.end ?? 0;
        const lastImportPos = document.textDocument.positionAt(lastImportOffset);
        const range = { start: lastImportPos, end: lastImportPos };

        const candidates = this.indexManager
            .allElements('Entity')
            .filter((desc) => desc.name === diagnostic.data.refText)
            .toArray();

        return candidates.map((desc) => {
            const entityName = desc.name;
            const filePath = resolveRelativePath(desc.documentUri.fsPath, document);
            let newText = `from "${filePath}" import ${entityName}`;
            newText = lastImportOffset ? `\n${newText}` : `${newText}\n\n`;

            return {
                title: `Import '${entityName}' from '${filePath}'`,
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [document.textDocument.uri]: [{ range, newText }],
                    },
                },
            };
        });
    }

    getCodeActions(document: LangiumDocument, params: CodeActionParams): MaybePromise<Array<Command | CodeAction>> {
        const result: CodeAction[] = [];
        for (const diagnostic of params.context.diagnostics) {
            const issueCode = diagnostic.code || '';
            const providers = actionProviders[issueCode] || [];
            for (let provider of providers) {
                provider = provider.bind(this);
                const actions = provider(diagnostic, document);
                if (Array.isArray(actions)) {
                    result.push(...actions);
                } else {
                    result.push(actions);
                }
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
