import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the template file next to this module and read it synchronously.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmplPath = path.join(__dirname, '..', 'sync.tmpl');

export const syncContent = fs.readFileSync(tmplPath, { encoding: 'utf8' });

/**
 * Async loader for the template if consumers prefer async I/O.
 * Example: const content = await loadSyncContent();
 */
export async function loadSyncContent() {
  return fs.promises.readFile(tmplPath, { encoding: 'utf8' });
}

// Provide a default export for compatibility with default imports.
export default syncContent;
