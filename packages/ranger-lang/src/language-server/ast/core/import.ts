import { getDocument, LangiumDocument, ValidationAcceptor } from 'langium';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver';

import { Document, Import } from '../../generated/ast';
import { buildDocument, hasErrors, isRangerFile, resolvePath, resolveRelativePath } from '../../ranger-documents';
import { Issues } from '../../ranger-validator';
import { Check, Fix, NoOpCompanion } from '../Companion';

export class ImportCompanion extends NoOpCompanion {
    seen = new Set<string>();

    @Check
    correctFileExtension(imp: Import, accept: ValidationAcceptor) {
        const issue = Issues.WrongFileExtension;
        const filePath = imp.filePath.value;
        if (filePath && !filePath.endsWith('.ranger')) {
            accept('error', issue.msg, { node: imp.filePath, property: 'value', code: issue.code });
        }
    }

    @Check
    async noValidationErrors(imp: Import, accept: ValidationAcceptor) {
        const relPath = imp.filePath.value;
        const absPath = resolvePath(relPath, imp);
        if (!isRangerFile(absPath)) {
            return;
        }

        const importId = `${getDocument(imp).uri.fsPath} - ${imp.$cstNode?.text}`;
        if (this.seen.has(importId)) {
            return;
        }

        this.seen.add(importId);
        const document = await buildDocument(this.services, absPath);
        this.seen.delete(importId);

        if (hasErrors(document)) {
            accept('error', `${Issues.DocumentHasErrors.msg}: '${relPath}'`, {
                node: imp.filePath,
                property: 'value',
                code: Issues.DocumentHasErrors.code,
            });
        }
    }

    @Fix(Issues.ReferenceError.code)
    suggestImport(diagnostic: Diagnostic, document: LangiumDocument): CodeAction[] {
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
}
