import * as langium from 'langium';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

import { createRangerServices } from './ranger-module';

export function startLanguageServer() {
    // Create a connection to the client
    const connection = createConnection(ProposedFeatures.all);

    // Inject the shared services and language-specific services
    const { shared } = createRangerServices({ connection, ...NodeFileSystem });

    // Start the language server with the shared services
    langium.startLanguageServer(shared);
}

if (require.main === module) {
    startLanguageServer();
}
