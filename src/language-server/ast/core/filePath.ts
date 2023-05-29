import fs from 'fs';
import { ValidationAcceptor } from 'langium';

import { AFilePath } from '../../generated/ast';
import { resolvePath } from '../../ranger-documents';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
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
}
