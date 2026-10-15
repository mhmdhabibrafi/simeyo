const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const entry=require.resolve('query-string');
const version=require('query-string/package.json').version;
const decoderEntry=require.resolve('decode-uri-component');
const decoder=JSON.parse(fs.readFileSync(path.join(path.dirname(decoderEntry),'package.json'),'utf8'));
assert.equal(version,'7.1.3','Review the compatibility patch after a query-string upgrade.');
assert.equal(decoder.version,'0.5.0','Use the patched URI decoder.');
const original="const decodeComponent = require('decode-uri-component');";
const patched="const decodeComponent = require('decode-uri-component').default;";
const source=fs.readFileSync(entry,'utf8');
// The security-fixed decoder is ESM; SDK 57's CJS query-string caller needs its default export.
if(source.includes(original))fs.writeFileSync(entry,source.replace(original,patched));
else assert.ok(source.includes(patched),'Unexpected query-string source; do not ship without reviewing URI decoding.');
console.log('Verified query-string interoperability with the security-fixed URI decoder.');
