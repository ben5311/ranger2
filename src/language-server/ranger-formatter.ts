import {
    AbstractFormatter,
    AstNode,
    CstNode,
    Formatting,
    FormattingAction,
    FormattingContext,
    isRootCstNode,
    LangiumDocument,
} from 'langium';
import { FormattingOptions, Range, TextEdit } from 'vscode-languageserver';

import { hasErrors } from '../utils/documents';
import * as ast from './generated/ast';

export class RangerFormatter extends AbstractFormatter {
    constructor(public formatOnErrors = false) {
        super();
    }

    override doDocumentFormat(document: LangiumDocument, options: FormattingOptions, range?: Range): TextEdit[] {
        return !hasErrors(document) || this.formatOnErrors ? super.doDocumentFormat(document, options, range) : [];
    }

    protected format(node: AstNode): void {
        const formatter = this.getNodeFormatter(node);
        if (ast.isDocument(node)) {
            node.imports.forEach((imp, index) => {
                const import_ = formatter.node(imp);
                if (index == 0) import_.prepend(Formatting.noSpace());
                import_.append(Formatting.newLines(index < node.imports.lastIndex() ? 1 : 2));
            });
        } else if (ast.isObjekt(node)) {
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            const interior = formatter.interior(bracesOpen, bracesClose);
            interior.prepend(Formatting.indent({ allowMore: true }));
            bracesClose.prepend(Formatting.newLine());
            if (ast.isEntity(node.$container)) {
                const entity = formatter.node(node.$container);
                entity.prepend(Formatting.noIndent());
                bracesClose.append(Formatting.newLines(2));
            }
        } else if (ast.isProperty(node)) {
            const value = formatter.node(node.value);
            value.prepend(Formatting.spaces(1));
        }
    }

    override createTextEdit(
        a: CstNode | undefined,
        b: CstNode,
        formatting: FormattingAction,
        context: FormattingContext,
    ): TextEdit[] {
        // Add trailing commas to properties
        /*  if (ast.isProperty(b.element) && !b.text.endsWith(',')) {
            const textEdit: TextEdit = {
                range: b.range,
                newText: b.text.trimEnd() + ',',
            };
            return [textEdit];
        } */
        // Fix for no blank lines between Entities if they have a comment on top
        if (b.hidden && b.text.match(/\/[/*]/) && isRootCstNode(b.parent)) {
            b = {
                parent: b.parent,
                text: b.text,
                root: b.root,
                feature: b.feature,
                element: b.element,
                range: b.range,
                offset: b.offset,
                length: b.length,
                end: b.end,
                hidden: false,
            };
        }
        return super.createTextEdit(a, b, formatting, context);
    }
}
