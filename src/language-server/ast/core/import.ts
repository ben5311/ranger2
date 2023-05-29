import { getDocument, ValidationAcceptor } from 'langium';

import { Import } from '../../generated/ast';
import { buildDocument, hasErrors, isRangerFile, resolvePath } from '../../ranger-documents';
import { Issues } from '../../ranger-validator';
import { Check, NoOpCompanion } from '../Companion';

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
}
