/**
 * Recursive Length Prefix encoding and decoding.
 *
 * RLP is how Ethereum serialises transactions, block headers and trie nodes. Two
 * rules cover the whole spec, which is why it is worth reimplementing rather
 * than pulling a dependency into a script that only needs to inspect one
 * transaction.
 *
 *   byte < 0x80                -> itself
 *   string 0..55 bytes         -> 0x80+len, then the bytes
 *   string 56+ bytes           -> 0xb7+lenOfLen, big-endian len, then bytes
 *   list                       -> the same two cases with 0xc0 as the base
 */

export function encodeBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error("encodeBytes expects a Uint8Array");
  if (bytes.length === 1 && bytes[0] < 0x80) return Uint8Array.of(bytes[0]);
  return concat(encodeLength(bytes.length, 0x80), bytes);
}

export function encodeList(items) {
  for (const it of items) {
    if (!(it instanceof Uint8Array)) throw new Error("encodeList expects encoded items");
  }
  const payload = concat(...items);
  return concat(encodeLength(payload.length, 0xc0), payload);
}

function encodeLength(len, offset) {
  if (len < 56) return Uint8Array.of(offset + len);
  const be = [];
  for (let n = len; n > 0; n = Math.floor(n / 256)) be.unshift(n & 0xff);
  return Uint8Array.of(offset + 55 + be.length, ...be);
}

export function concat(...arrays) {
  const total = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const a of arrays) {
    out.set(a, at);
    at += a.length;
  }
  return out;
}

export function toHex(bytes) {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(input) {
  const s = String(input).replace(/^0x/i, "");
  if (s.length % 2) throw new Error("odd number of hex digits");
  if (!/^[0-9a-fA-F]*$/.test(s)) throw new Error("non-hex character");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Decode exactly one item. Rejects trailing bytes and non-canonical lengths. */
export function decode(input) {
  const bytes = input instanceof Uint8Array ? input : fromHex(input);
  const [item, used] = decodeAt(bytes, 0);
  if (used !== bytes.length) throw new Error(`trailing bytes: ${bytes.length - used}`);
  return item;
}

/** Decode the item starting at `pos`. Returns [item, nextPos]. */
export function decodeAt(bytes, pos) {
  if (pos >= bytes.length) throw new Error("unexpected end of input");
  const first = bytes[pos];

  if (first < 0x80) return [new Uint8Array([first]), pos + 1];

  if (first <= 0xb7) {
    const len = first - 0x80;
    if (len === 1 && bytes[pos + 1] !== undefined && bytes[pos + 1] < 0x80) {
      throw new Error("non-canonical single byte");
    }
    return [take(bytes, pos + 1, len), pos + 1 + len];
  }

  if (first <= 0xbf) {
    const lenOfLen = first - 0xb7;
    const len = readLength(bytes, pos + 1, lenOfLen);
    if (len < 56) throw new Error("non-canonical long form");
    const start = pos + 1 + lenOfLen;
    return [take(bytes, start, len), start + len];
  }

  let payloadLen;
  let start;
  if (first <= 0xf7) {
    payloadLen = first - 0xc0;
    start = pos + 1;
  } else {
    const lenOfLen = first - 0xf7;
    payloadLen = readLength(bytes, pos + 1, lenOfLen);
    if (payloadLen < 56) throw new Error("non-canonical long form");
    start = pos + 1 + lenOfLen;
  }
  const end = start + payloadLen;
  if (end > bytes.length) throw new Error("list payload runs past the end");
  const items = [];
  let cursor = start;
  while (cursor < end) {
    const [item, next] = decodeAt(bytes, cursor);
    if (next > end) throw new Error("nested item runs past the list");
    items.push(item);
    cursor = next;
  }
  return [items, end];
}

function take(bytes, start, len) {
  const end = start + len;
  if (end > bytes.length) throw new Error("payload runs past the end");
  return bytes.slice(start, end);
}

function readLength(bytes, pos, lenOfLen) {
  const slice = bytes.slice(pos, pos + lenOfLen);
  if (slice.length !== lenOfLen) throw new Error("unexpected end of length prefix");
  if (slice[0] === 0) throw new Error("leading zero in length");
  let n = 0;
  for (const b of slice) n = n * 256 + b;
  return n;
}

/** Render a decoded item as nested hex, the way a explorer shows RLP. */
export function pretty(item) {
  return Array.isArray(item) ? item.map(pretty) : toHex(item);
}

/** Parse a big-endian integer, rejecting a leading zero byte. */
export function toBigInt(bytes) {
  if (bytes.length === 0) return 0n;
  if (bytes[0] === 0) throw new Error("integer has a leading zero byte");
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n;
}
