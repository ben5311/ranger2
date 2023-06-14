import { AstNode, IndexManager, SemanticTokenAcceptor, ValidationCheck } from 'langium';

import { ActionProviderFunction } from '../ranger-actions';
import { RangerGenerator } from '../ranger-generator';
import { RangerServices } from '../ranger-module';
import { RangerScopeProvider } from '../ranger-scope';
import { CodeHighlighter } from './CodeHighlighter';
import { ValueGenerator } from './ValueGenerator';

export abstract class Companion<T extends AstNode> {
    checks!: ValidationCheck[];
    fixes!: Map<string, ActionProviderFunction>;
    generator: RangerGenerator;
    indexManager: IndexManager;
    scopeProvider: RangerScopeProvider;

    constructor(protected services: RangerServices) {
        this.checks = this.checks || [];
        this.fixes = this.fixes || new Map();
        this.generator = services.generator.Generator;
        this.indexManager = services.shared.workspace.IndexManager;
        this.scopeProvider = services.references.ScopeProvider as RangerScopeProvider;
    }

    /**
     * Create the ValueGenerator for this node.
     */
    abstract valueGenerator(node: T): ValueGenerator | undefined;

    /**
     * Compute the Hover for this node.
     */
    abstract hover(node: T, highlight: CodeHighlighter): string | undefined;

    /**
     * Highlight semantic tokens for this node.
     */
    abstract highlight(node: T, highlight: SemanticTokenAcceptor): void;
}

export class NoOpCompanion extends Companion<AstNode> {
    valueGenerator = () => undefined;
    hover = () => undefined;
    highlight = () => undefined;
}

/**
 * Check Decorator
 *
 * @example
 *
  @Check
  nameStartsWithCapital(entity: Entity, accept: ValidationAcceptor) {
      const firstChar = entity.name.substring(0, 1);
      if (firstChar.toUpperCase() !== firstChar) {
          accept('warning', 'Name must start with a capital', {
              node: entity,
              property: 'name',
              code: 'name-not-capitalized'
          });
      }
  }
 *
 */
export function Check(target: Companion<any>, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
    target.checks = target.checks || [];
    target.checks.push(propertyDescriptor.value);
}

/**
 * Quick Fix Decorator
 *
 * @example
 *
  @Fix('name-not-capitalized')
  makeUpperCase(diagnostic: Diagnostic, document: LangiumDocument): CodeAction | CodeAction[] {
      const start = diagnostic.range.start;
      const end = { line: start.line, character: start.character + 1 };
      const range = { start, end };
      const newText = document.textDocument.getText(range).toUpperCase();
      return {
          title: 'Change first letter to upper case',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
              changes: { [document.textDocument.uri]: [{ range, newText }] },
          },
      };
  }
 *
 */
export function Fix(issueCode: string): any {
    return function (target: Companion<any>, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
        target.fixes = target.fixes || new Map();
        target.fixes.set(issueCode, propertyDescriptor.value);
    };
}
