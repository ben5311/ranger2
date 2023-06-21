import { SemanticTokenAcceptor } from 'langium';

import { Duration } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class DurationCompanion extends Companion<Duration> {
    override valueGenerator(_duration: Duration): ValueGenerator {
        throw 'Not implemented';
    }

    override hover(_duration: Duration, _highlight: CodeHighlighter): string | undefined {
        return undefined;
    }

    override highlight(duration: Duration, highlight: SemanticTokenAcceptor): void {
        for (const keyword of ['DAYS', 'WEEKS', 'MONTHS', 'YEARS']) {
            highlight({ node: duration, keyword, type: 'keyword' });
        }
    }
}
