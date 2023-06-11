import {
    convertBigint,
    convertBoolean,
    convertDate,
    convertID,
    convertInt,
    convertNumber,
    convertRegexLiteral,
    convertString,
    CstNode,
    DefaultValueConverter,
    ValueType,
} from 'langium';
import { AbstractRule } from 'langium/lib/grammar/generated/ast';
import { getRuleType } from 'langium/lib/grammar/internal-grammar-util';

export class RangerValueConverter extends DefaultValueConverter {
    protected override runConverter(rule: AbstractRule, input: string, _cstNode: CstNode): ValueType {
        switch (rule.name.toUpperCase()) {
            case 'INT':
                return convertInt(input);
            case 'STRING':
            case 'DATE':
            case 'TIMESTAMP':
                return convertString(input);
            case 'ID':
                return convertID(input);
            case 'REGEXLITERAL':
                return convertRegexLiteral(input);
        }
        switch (getRuleType(rule)?.toLowerCase()) {
            case 'number':
                return convertNumber(input);
            case 'boolean':
                return convertBoolean(input);
            case 'bigint':
                return convertBigint(input);
            case 'date':
                return convertDate(input);
            default:
                return input;
        }
    }
}
