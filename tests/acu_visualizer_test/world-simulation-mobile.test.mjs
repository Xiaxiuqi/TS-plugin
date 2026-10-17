import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../public/acu_world_simulation/index.js', import.meta.url), 'utf8');
const fallbackUrl = new URL('../../public/acu_world_simulation/vendor/sha256.mjs', import.meta.url).href;
const digestSource = source.slice(source.indexOf('let fallbackSha256'), source.indexOf('function applyDelta'))
  .replace("'./vendor/sha256.mjs'", JSON.stringify(fallbackUrl));
const createDigest = crypto => new Function('globalThis', `${digestSource}\nreturn digest;`)({ crypto });

for (const [name, crypto] of [['Web Crypto', webcrypto], ['无 subtle 的手机 HTTP', {}], ['无 crypto', undefined]]) {
  test(`${name} 的摘要与数据库 SHA-256 完全一致`, async () => {
    const digest = createDigest(crypto);
    for (const value of ['', 'abc', '正文<与此同时>钟声响起。</与此同时>✦', '\ud800', '长正文'.repeat(10000)]) {
      assert.equal(await digest(value), createHash('sha256').update(value).digest('hex'));
    }
  });
}
