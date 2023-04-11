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
import { DiagnosticSeverity, FormattingOptions, Range, TextEdit } from 'vscode-languageserver';

import * as ast from './generated/ast';

export class RangerFormatter extends AbstractFormatter {
    override doDocumentFormat(document: LangiumDocument, options: FormattingOptions, range?: Range): TextEdit[] {
        // Do not format if document has validation errors
        const errors = document.diagnostics?.filter((d) => d.severity === DiagnosticSeverity.Error).length;
        return errors ? [] : super.doDocumentFormat(document, options, range);
    }

    protected format(node: AstNode): void {
        const formatter = this.getNodeFormatter(node);
        if (ast.isObjekt(node)) {
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            const interior = formatter.interior(bracesOpen, bracesClose);
            interior.prepend(Formatting.indent({ allowMore: true }));
            bracesClose.prepend(Formatting.newLine());
            if (ast.isEntity(node.$container)) {
                bracesClose.append(Formatting.newLines(2));
            }
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
