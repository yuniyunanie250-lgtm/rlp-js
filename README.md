# rlp

Recursive Length Prefix encoding and decoding in JavaScript, with no
dependencies.

RLP is the serialisation Ethereum uses below the transaction layer: signed
transaction payloads, block headers, and the nodes of the state trie. Two rules
cover the whole format, which makes it worth having as a readable 150 lines
instead of an opaque dependency in a script that inspects one transaction.

## Usage

```bash
npx github:yuniyunanie250-lgtm/rlp-js decode 0xc88363617483646f67
# [["0x636174"],["0x646f67"]]

npx github:yuniyunanie250-lgtm/rlp-js encode-str 0x646f67
# 0x83646f67
```

As a library:

```js
import { decode, encodeBytes, encodeList, fromHex, toHex } from "rlp";
const signed = decode(rawTransactionHex);
```

## Strictness this implementation keeps

- **Canonical lengths.** `0x81 0x05` is rejected, because a single byte below
  `0x80` must encode as itself. Accepting both forms means two different byte
  strings decode to the same value, which is a consensus bug waiting to happen.
- **No trailing bytes** in `decode`; use `decodeAt` to walk a stream.
- **No leading zero in a length prefix.**
- **`toBigInt` rejects a leading zero byte**, matching the integer convention
  Ethereum uses for nonces, gas and values.

## What it does not do

- **No typed transaction decoding.** RLP gives you nested byte strings; mapping
  them onto `(nonce, gasPrice, to, value, data, v, r, s)` is the next layer.
- **No streaming.** Input is a byte array in memory.

## Development

```bash
npm test
```

## License

MIT
