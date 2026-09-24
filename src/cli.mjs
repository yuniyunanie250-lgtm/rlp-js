#!/usr/bin/env node
import { decode, encodeBytes, encodeList, fromHex, pretty, toHex } from "./rlp.mjs";

const HELP = `rlp -- Recursive Length Prefix encode and decode

usage:
  rlp decode <hex>            decode one RLP item, print nested hex
  rlp encode-str <hex>        encode a byte string
  rlp encode-list <hex> ...   encode a list of already-encoded items

examples:
  rlp decode 0xc88363617483646f67
  rlp encode-str 0x646f67
`;

function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help") return void process.stdout.write(HELP);
  if (cmd === "decode") {
    if (!rest[0]) throw new Error("decode needs a hex payload");
    console.log(JSON.stringify(pretty(decode(rest[0]))));
    return;
  }
  if (cmd === "encode-str") {
    if (!rest[0]) throw new Error("encode-str needs a hex payload");
    console.log(toHex(encodeBytes(fromHex(rest[0]))));
    return;
  }
  if (cmd === "encode-list") {
    console.log(toHex(encodeList(rest.map(fromHex))));
    return;
  }
  throw new Error(`unknown command: ${cmd}`);
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`rlp: ${err.message}`);
  process.exit(1);
}
