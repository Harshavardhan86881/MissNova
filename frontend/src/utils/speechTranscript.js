/**
 * Web Speech helpers — especially for mobile Chrome/Safari.
 *
 * Desktop engines usually emit disjoint finals + short interim deltas.
 * Mobile often keeps earlier finals AND emits a newer final/interim that
 * already contains those words → naive join shows "hello hello hi…".
 */

const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();

/**
 * Merge final result pieces so longer hypotheses supersede shorter duplicates
 * instead of concatenating into loops.
 */
export function mergeFinalTranscripts(pieces) {
    let acc = '';
    for (const raw of pieces) {
        const piece = normalize(raw);
        if (!piece) continue;
        if (!acc) {
            acc = piece;
            continue;
        }

        const a = acc.toLowerCase();
        const p = piece.toLowerCase();

        if (p === a) continue;
        // Newer result is a longer re-hypothesis of everything so far
        if (p.startsWith(`${a} `) || (` ${p} `).includes(` ${a} `)) {
            acc = piece;
            continue;
        }
        // Older accumulator already covers this piece
        if (a.startsWith(`${p} `) || (` ${a} `).includes(` ${p} `) || a.endsWith(` ${p}`) || a.endsWith(p)) {
            continue;
        }

        acc = `${acc} ${piece}`;
    }
    return acc ? `${acc} ` : '';
}

/**
 * Mobile interim often re-includes words already in the final buffer.
 * Strip that overlap so UI does not render finals twice (final + interim).
 */
export function stripInterimOverlap(finalText, interim) {
    const f = normalize(finalText);
    const i = normalize(interim);
    if (!i) return '';
    if (!f) return i;

    const fL = f.toLowerCase();
    const iL = i.toLowerCase();

    if (iL === fL) return '';
    if (iL.startsWith(`${fL} `) || iL.startsWith(fL)) {
        return normalize(i.slice(f.length));
    }

    // Drop leading interim words that match trailing final words
    const fWords = fL.split(' ');
    const iWords = i.split(' ');
    const max = Math.min(fWords.length, iWords.length);
    let overlap = 0;
    for (let n = max; n > 0; n -= 1) {
        const tail = fWords.slice(-n).join(' ');
        const head = iWords.slice(0, n).join(' ').toLowerCase();
        if (tail === head) {
            overlap = n;
            break;
        }
    }
    return iWords.slice(overlap).join(' ');
}

/** Parse a SpeechRecognition event into de-duplicated final + interim strings. */
export function parseSpeechResultEvent(event) {
    const finals = [];
    let interim = '';
    for (let i = 0; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finals.push(piece);
        else interim += piece;
    }
    const finalText = mergeFinalTranscripts(finals);
    return {
        finalText,
        interim: stripInterimOverlap(finalText, interim),
    };
}
