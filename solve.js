// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference program).
// run(input) returns exactly csv-reader's answer for every input:
// {columns, rows, errors} under its written broken-row policy (BOM drop, LF/CRLF,
// stray_cr, quote_junk, unterminated_quote, short_row/long_row, error order and
// line/row numbering — see the SPEC for the full policy).
//
// Speed comes from how the text is walked, never from changing what it means:
// one pass, delimiter jumps instead of a per-character loop (unquoted fields are
// found with /[,\r\n]/g, quoted fields with /["\r\n]/g), and field values are
// taken with String.slice instead of being built a character at a time. No
// per-field allocation on the clean path; errors are only allocated when met.
// Pure: no clock, no randomness, no locale, nothing kept from one call to the next.

/** Delimiters that end or interrupt an unquoted field. */
const UNQUOTED_DELIM = /[,\r\n]/g;
/** Characters that end or interrupt a quoted field. */
const QUOTED_DELIM = /["\r\n]/g;

/** How a field ended: at a comma (the record goes on), at a line break or at the end of the text (the record ends). */
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  function error(code, recordLine, recordRow) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads unquoted characters onto `value` up to the next comma or line break: a CR not followed by LF is dropped
  // (stray_cr). Returns the field and how it ended; `added` counts the characters kept.
  function scanUnquoted(value, recordLine, recordRow) {
    let added = 0;
    const re = UNQUOTED_DELIM;
    while (true) {
      re.lastIndex = pos;
      const m = re.exec(text);
      if (m === null) {
        if (pos < n) {
          added += n - pos;
          value += text.slice(pos);
          pos = n;
        }
        return { value, ended: END, added };
      }
      const i = m.index;
      const c = m[0];
      if (c === ',') {
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 1;
        return { value, ended: COMMA, added };
      }
      if (c === '\n') {
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      // CR: CRLF ends the field as a line break; a lone CR is dropped (stray_cr) and the field goes on.
      if (i + 1 < n && text.charCodeAt(i + 1) === 10) {
        if (i > pos) {
          added += i - pos;
          value += text.slice(pos, i);
        }
        pos = i + 2;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      if (i > pos) {
        added += i - pos;
        value += text.slice(pos, i);
      }
      pos = i + 1;
      error('stray_cr', recordLine, recordRow);
    }
  }

  // Reads a quoted field whose opening quote is at pos.
  function scanQuoted(recordLine, recordRow) {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    const re = QUOTED_DELIM;
    while (true) {
      re.lastIndex = pos;
      const m = re.exec(text);
      if (m === null) {
        // The quote never closes: it is a literal character, and the text after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        error('unterminated_quote', recordLine, recordRow);
        return scanUnquoted('"', recordLine, recordRow);
      }
      const i = m.index;
      const c = m[0];
      if (c === '"') {
        if (i > pos) value += text.slice(pos, i);
        if (i + 1 < n && text.charCodeAt(i + 1) === 34) {
          value += '"';
          pos = i + 2;
          continue;
        }
        pos = i + 1;
        if (pos >= n) return { value, ended: END };
        const d = text.charCodeAt(pos);
        if (d === 44) {
          pos += 1;
          return { value, ended: COMMA };
        }
        if (d === 10) {
          pos += 1;
          line += 1;
          return { value, ended: LINE_BREAK };
        }
        if (d === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          return { value, ended: LINE_BREAK };
        }
        // What follows the closing quote is appended as it stands, up to the next comma or line break.
        const junk = scanUnquoted(value, recordLine, recordRow);
        if (junk.added > 0) error('quote_junk', recordLine, recordRow);
        return junk;
      }
      if (c === '\n') {
        if (i > pos) value += text.slice(pos, i);
        value += '\n';
        line += 1;
        pos = i + 1;
        continue;
      }
      // CR inside quotes: CRLF and a lone CR are each one LF.
      if (i > pos) value += text.slice(pos, i);
      value += '\n';
      line += 1;
      pos = i + 1 < n && text.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? scanQuoted(recordLine, recordRow) : scanUnquoted('', recordLine, recordRow);
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
