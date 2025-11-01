import assert from 'node:assert/strict';
import { syncContent } from '../sync.mjs';

assert(typeof syncContent === 'string', 'syncContent should be a string');
assert(syncContent.includes('SYNC_CONTENT'), 'syncContent should include SYNC_CONTENT');

console.log('sync.test.mjs: OK');

// exit 0 implicitly
