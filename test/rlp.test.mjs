import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decode, decodeAt, encodeBytes, encodeList, fromHex, pretty, toBigInt, toHex,
} from "../src/rlp.mjs";

const hex = (s) => fromHex(s);

test("single low byte encodes as itself", () => {
  assert.equal(toHex(encodeBytes(hex("7f"))), "0x7f");
  assert.equal(toHex(encodeBytes(hex("00"))), "0x00");
});

test("single high byte gets a prefix", () => {
  assert.equal(toHex(encodeBytes(hex("80"))), "0x8180");
  assert.equal(toHex(encodeBytes(hex("ff"))), "0x81ff");
});

test("the classic reference vectors hold", () => {
  assert.equal(toHex(encodeBytes(hex(""))), "0x80");
  assert.equal(toHex(encodeBytes(hex("646f67"))), "0x83646f67");
  assert.equal(
    toHex(encodeList([encodeBytes(hex("636174")), encodeBytes(hex("646f67"))])),
    "0xc88363617483646f67",
  );
});

test("empty list and empty string are different", () => {
  assert.equal(toHex(encodeList([])), "0xc0");
  assert.equal(toHex(encodeBytes(hex(""))), "0x80");
});

test("strings of 56 bytes switch to the long form", () => {
  const encoded = encodeBytes(new Uint8Array(56).fill(0x61));
  assert.equal(encoded[0], 0xb8);
  assert.equal(encoded[1], 56);
  assert.equal(encoded.length, 58);
});

test("nested structures round trip", () => {
  const bytes = encodeList([
    encodeBytes(hex("636174")),
    encodeList([encodeBytes(hex("7075707079"))]),
    encodeBytes(new Uint8Array(0)),
  ]);
  const back = decode(bytes);
  assert.equal(pretty(back).length, 3);
  assert.deepEqual(pretty(back)[1], ["0x7075707079"]);
});

test("trailing bytes are rejected", () => {
  const withJunk = new Uint8Array([...encodeBytes(hex("646f67")), 0x00]);
  assert.throws(() => decode(withJunk), /trailing bytes/);
});

test("truncated input is rejected", () => {
  assert.throws(() => decode(hex("8364")), /runs past the end/);
});

test("non-canonical single byte is rejected", () => {
  assert.throws(() => decode(hex("8105")), /non-canonical single byte/);
});

test("decodeAt walks a stream", () => {
  const stream = new Uint8Array([...encodeBytes(hex("01")), ...encodeBytes(hex("02"))]);
  const [a, next] = decodeAt(stream, 0);
  const [b] = decodeAt(stream, next);
  assert.equal(toHex(a), "0x01");
  assert.equal(toHex(b), "0x02");
});

test("toBigInt rejects a leading zero", () => {
  assert.equal(toBigInt(hex("")), 0n);
  assert.equal(toBigInt(hex("01")), 1n);
  assert.equal(toBigInt(hex("ff")), 255n);
  assert.throws(() => toBigInt(hex("0001")), /leading zero/);
});
