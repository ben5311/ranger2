import { assign, cloneDeep } from 'lodash';

export const Config = {
    debug: false,
};
const ConfigBackup = cloneDeep(Config);

export function resetConfig() {
    assign(Config, ConfigBackup);
}
