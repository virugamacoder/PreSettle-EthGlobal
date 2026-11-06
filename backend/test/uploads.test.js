import { test } from "node:test";
import assert from "node:assert/strict";
import { sniffImage } from "../src/routes/uploads.js";

const bytes = (...b) => Buffer.from(b);

test("detects PNG, JPEG, GIF and WebP from their first bytes", () => {
  assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "png");
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0)), "jpg");
  assert.equal(sniffImage(Buffer.from("GIF89a....")), "gif");
  assert.equal(sniffImage(Buffer.concat([Buffer.from("RIFF"), bytes(1, 2, 3, 4), Buffer.from("WEBPVP8 ")])), "webp");
});

test("rejects SVG, HTML and empty bodies", () => {
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniffImage(Buffer.from("<html><body>hi</body></html>")), null);
  assert.equal(sniffImage(Buffer.alloc(0)), null);
});
