import {
    createDefaultModule,
    createDefaultSharedModule,
    DefaultSharedModuleContext,
    inject,
    LangiumServices,
    LangiumSharedServices,
    Module,
    PartialLangiumServices,
} from 'langium';

import { RangerGeneratedModule, RangerGeneratedSharedModule } from './generated/module';
import { RangerActionProvider } from './ranger-actions';
import { RangerValidator, registerValidationChecks } from './ranger-validator';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type RangerAddedServices = {
    validation: {
        RangerValidator: RangerValidator;
    };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type RangerServices = LangiumServices & RangerAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const RangerModule: Module<RangerServices, PartialLangiumServices & RangerAddedServices> = {
    validation: {
        RangerValidator: () => new RangerValidator(),
    },
    lsp: {
        CodeActionProvider: (services) => new RangerActionProvider(services),
    },
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
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
    const shared = inject(createDefaultSharedModule(context), RangerGeneratedSharedModule);
    const Ranger = inject(createDefaultModule({ shared }), RangerGeneratedModule, RangerModule);
    shared.ServiceRegistry.register(Ranger);
    registerValidationChecks(Ranger);
    return { shared, Ranger };
}
