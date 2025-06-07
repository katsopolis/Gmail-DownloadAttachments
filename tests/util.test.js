const assert = require('assert');
const { stripUrl, getFilenameFromUrl, removeUrlImageParameters } = require('../util.js');

// stripUrl tests
assert.strictEqual(stripUrl('https://example.com/file'), 'https://example.com/file');
assert.strictEqual(stripUrl('not-a-url'), null);
assert.strictEqual(stripUrl(''), null);

// getFilenameFromUrl tests
assert.strictEqual(getFilenameFromUrl('https://example.com/path/file.txt'), 'file.txt');
assert.strictEqual(getFilenameFromUrl('https://example.com/dir/Some%20File.pdf?version=1#section'), 'Some File.pdf');
assert.strictEqual(getFilenameFromUrl('https://example.com/path/fi<le>.txt?abc'), 'fi_le_.txt');

// removeUrlImageParameters tests
assert.strictEqual(removeUrlImageParameters('https://example.com/img=s200-h200'), 'https://example.com/img');
assert.strictEqual(removeUrlImageParameters('https://example.com/image'), 'https://example.com/image');
assert.strictEqual(removeUrlImageParameters(null), null);

console.log('All tests passed!');

