import {
    createDefaultModule,
    createDefaultSharedModule,
    DefaultSharedModuleContext,
    inject,
    LangiumServices,
    LangiumSharedServices,
    Module,
    PartialLangiumServices,
    PartialLangiumSharedServices,
} from 'langium';

import { RangerGeneratedModule, RangerGeneratedSharedModule } from './generated/module';
import { RangerActionProvider } from './ranger-actions';
import { RangerExecuteCommandHandler } from './ranger-commands';
import { RangerCompanions } from './ranger-companions';
import { RangerCompletionProvider } from './ranger-completions';
import { RangerDefinitionProvider } from './ranger-definition';
import { RangerFormatter } from './ranger-formatter';
import { RangerGenerator } from './ranger-generator';
import { RangerHoverProvider } from './ranger-hover';
import { IndexAccess } from './ranger-index';
import { RangerValueConverter } from './ranger-parser';
import { RangerScopeProvider } from './ranger-scope';
import { RangerLanguageServer } from './ranger-server';
import { RangerDocumentSymbolProvider, RangerWorkspaceSymbolProvider, WorkspaceSymbolProvider } from './ranger-symbols';
import { RangerTokenProvider } from './ranger-tokens';
import { RangerValidator, registerValidationChecks } from './ranger-validator';

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type RangerServices = LangiumServices & RangerAddedServices;

/**
 * Declaration of custom services - add your own service types here.
 */
export type RangerAddedServices = {
    generator: {
        Generator: RangerGenerator;
        Companions: RangerCompanions;
    };
    validation: {
        Validator: RangerValidator;
    };
    workspace: {
        IndexAccess: IndexAccess;
        WorkspaceSymbolProvider: WorkspaceSymbolProvider;
    };
};

/**
 * Dependency injection module that overrides Langium default shared services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services.
 */
export const RangerSharedModule: Module<LangiumSharedServices, PartialLangiumSharedServices> = {
    lsp: {
        ExecuteCommandHandler: (services) => new RangerExecuteCommandHandler(services),
        LanguageServer: (services) => new RangerLanguageServer(services),
    },
    workspace: {},
};

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const RangerModule: Module<RangerServices, PartialLangiumServices & RangerAddedServices> = {
    generator: {
        Generator: (services) => new RangerGenerator(services),
        Companions: (services) => new RangerCompanions(services),
    },
    lsp: {
        CodeActionProvider: (services) => new RangerActionProvider(services),
        CompletionProvider: (services) => new RangerCompletionProvider(services),
        DefinitionProvider: (services) => new RangerDefinitionProvider(services),
        DocumentSymbolProvider: (services) => new RangerDocumentSymbolProvider(services),
        Formatter: () => new RangerFormatter(),
        HoverProvider: (services) => new RangerHoverProvider(services),
        SemanticTokenProvider: (services) => new RangerTokenProvider(services),
    },
    parser: {
        ValueConverter: () => new RangerValueConverter(),
    },
    references: {
        ScopeProvider: (services) => new RangerScopeProvider(services),
    },
    validation: {
        Validator: (services) => new RangerValidator(services),
    },
    workspace: {
        IndexAccess: (services) => new IndexAccess(services),
        WorkspaceSymbolProvider: (services) => new RangerWorkspaceSymbolProvider(services),
    },
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging three modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createRangerServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    Ranger: RangerServices;
} {
    const shared = inject(createDefaultSharedModule(context), RangerGeneratedSharedModule, RangerSharedModule);
    const Ranger = inject(createDefaultModule({ shared }), RangerGeneratedModule, RangerModule);
    shared.ServiceRegistry.register(Ranger);
    registerValidationChecks(Ranger);
    return { shared, Ranger };
}
