import fs from 'fs';
import { LangiumDocument, ValidationAcceptor } from 'langium';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver';

import { AFilePath } from '../../generated/ast';
import { resolvePath } from '../../ranger-documents';
import { Issues } from '../../ranger-validator';
import { Check, Fix } from '../Companion';
import { LiteralCompanion } from './literal';

export class FilePathCompanion extends LiteralCompanion {
    @Check
    fileExists(filePath: AFilePath, accept: ValidationAcceptor) {
        const issue = Issues.FileDoesNotExist;
        const path = resolvePath(filePath, filePath);
        if (!fs.existsSync(path)) {
            accept('error', `${issue.msg}: '${path}'`, { node: filePath, property: 'value', code: issue.code });
        }
    }

    @Check
    noBackslashesInFilePath(filePath: AFilePath, accept: ValidationAcceptor) {
        const issue = Issues.FilePathWithBackslashes;
        if (filePath.$cstNode?.text.includes('\\')) {
            accept('warning', issue.msg, { node: filePath, property: 'value', code: issue.code });
        }
    }

    @Fix(Issues.FilePathWithBackslashes.code)
    replaceWithForwardSlashes(diagnostic: Diagnostic, document: LangiumDocument): CodeAction {
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
}
