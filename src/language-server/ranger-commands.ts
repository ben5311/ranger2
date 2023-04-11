import { AbstractExecuteCommandHandler, ExecuteCommandAcceptor, LangiumSharedServices } from 'langium';

import { Config } from './ranger-config';
import { RangerDocumentBuilder } from './ranger-index';

export class RangerExecuteCommandHandler extends AbstractExecuteCommandHandler {
    protected readonly documentBuilder: RangerDocumentBuilder;

    constructor(protected services: LangiumSharedServices) {
        super();
        this.documentBuilder = services.workspace.DocumentBuilder as RangerDocumentBuilder;
    }

    registerCommands(register: ExecuteCommandAcceptor): void {
        register('ranger.toggleDebugView', () => {
            Config.debug = !Config.debug;
            this.documentBuilder.invalidateAllDocuments();
        });
    }
}
