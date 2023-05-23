import fs from 'fs';
import { CstNode, DefaultDefinitionProvider } from 'langium';
import { DefinitionParams, LocationLink, Range } from 'vscode-languageserver';

import { fileURI, resolvePath } from '../utils/documents';
import * as ast from './generated/ast';

export class RangerDefinitionProvider extends DefaultDefinitionProvider {
    override collectLocationLinks(cstNode: CstNode, _params: DefinitionParams) {
        const astNode = cstNode.element;
        if (ast.isAFilePath(astNode)) {
            return this.getFilePathLink(astNode);
        }

        return super.collectLocationLinks(cstNode, _params);
    }

    getFilePathLink(filePath: ast.AFilePath): LocationLink[] | undefined {
        const absPath = resolvePath(filePath.value, filePath);
        const fileUri = fileURI(absPath);
        if (fs.existsSync(absPath)) {
            const targetRange: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
            const selectionRange = filePath.$cstNode?.range;
            return [LocationLink.create(fileUri.toString(), targetRange, targetRange, selectionRange)];
        }

        return undefined;
    }
}
