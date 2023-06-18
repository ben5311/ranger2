import { CodeActionProvider, LangiumDocument, MaybePromise, MultiMap } from 'langium';
import { CodeActionParams, Diagnostic } from 'vscode-languageserver';
import { CodeAction, Command } from 'vscode-languageserver-types';

import { RangerServices } from './ranger-module';

export type ActionProviderFunction = (diagnostic: Diagnostic, document: LangiumDocument) => CodeAction | CodeAction[];

export class RangerActionProvider implements CodeActionProvider {
    providers = new MultiMap<string, ActionProviderFunction>();

    constructor(protected services: RangerServices) {
        const companions = this.services.generator.Companions.companions;
        for (let companion of companions.values()) {
            for (let [issueCode, provider] of companion.fixes) {
                this.providers.add(issueCode, provider.bind(companion));
            }
        }
    }

    getCodeActions(document: LangiumDocument, params: CodeActionParams): MaybePromise<Array<Command | CodeAction>> {
        const result: CodeAction[] = [];

        for (const diagnostic of params.context.diagnostics) {
            const issueCode = `${diagnostic.code}`;
            const providers = this.providers.get(issueCode);

            for (const provider of providers) {
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
