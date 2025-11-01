// sync.mjs: CLI entrypoint and compatibility re-exports.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
// Defer importing CLI-heavy dependencies until run-time to keep module lightweight when imported.

// Re-export the template utilities from the library module.
export { syncContent, loadSyncContent } from './lib/template.mjs';
export { default } from './lib/template.mjs';

// Only run CLI logic when executed directly (not when imported by tests).
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
		// Import yargs lazily so tests/importers that only need exports don't require it.
		const yargsLib = await import('yargs/yargs');
		const { hideBin } = await import('yargs/helpers');
		const argv = yargsLib.default(hideBin(process.argv))
			.option('once', { type: 'boolean', description: 'Process the changelog file once' })
			.option('auth', { type: 'boolean', description: 'Run auth flow (placeholder)' })
			.option('print-default-list', { type: 'boolean', description: 'Print the default SYNC_CONTENT template' })
			.option('list-tasks', { type: 'number', description: 'List tasks (placeholder)' })
		    .option('watch', { type: 'boolean', description: 'Watch changelog for live updates (placeholder)' })
		    .option('dry-run', { type: 'boolean', description: 'Do not perform network or state-changing operations; simulate only' })
			.option('rcon-test', { type: 'string', description: 'Send an RCON test message' })
			.help()
			.parse();

	// Lightweight implementations to restore CLI behavior without external side effects.
	(async () => {
		if (argv['print-default-list']) {
			// Print the template export.
			const { syncContent } = await import('./lib/template.mjs');
			console.log(syncContent);
			return;
		}

		if (argv.auth) {
			// Run device-code auth and persist cache via lib/sync-lib
			const { deviceCodeAuth } = await import('./lib/sync-lib.mjs');
			const cfg = {
				clientId: process.env.CLIENT_ID,
				tenantId: process.env.TENANT_ID || 'common',
				scopes: (process.env.SCOPES || 'Tasks.ReadWrite').split(/\s+/),
				tokenCacheFile: process.env.TOKEN_CACHE_FILE || '.cache/msal_cache.json',
			};
			if (!cfg.clientId) {
				console.error('CLIENT_ID not set in environment. Aborting auth.');
				return;
			}
			if (argv['dry-run']) {
				console.log('[dry-run] auth: would invoke device-code flow and persist tokens to', cfg.tokenCacheFile);
			} else {
				try {
					const token = await deviceCodeAuth(cfg);
					console.log('Auth succeeded — access token acquired (length:', token ? token.length : 0, ').');
				} catch (err) {
					console.error('Auth failed:', err instanceof Error ? err.message : String(err));
				}
			}
			return;
		}

		if (typeof argv['list-tasks'] === 'number') {
			// Acquire a token and list tasks using the Graph helper.
			try {
				const cfg = { clientId: process.env.CLIENT_ID, tenantId: process.env.TENANT_ID || 'common', scopes: (process.env.SCOPES || 'Tasks.ReadWrite').split(/\s+/), tokenCacheFile: process.env.TOKEN_CACHE_FILE || '.cache/msal_cache.json' };
				if (!cfg.clientId) {
					console.error('CLIENT_ID not set in environment. Cannot list tasks.');
					return;
				}
				if (argv['dry-run']) {
					console.log('[dry-run] list-tasks: would authenticate and call Graph to list tasks from the default list.');
					return;
				}
				const { deviceCodeAuth, createGraphClient, createOrGetDefaultList, listTasks } = await import('./lib/sync-lib.mjs');
				const token = await deviceCodeAuth(cfg);
				const graph = createGraphClient(token);
				const listId = await createOrGetDefaultList(graph);
				const tasks = await listTasks(graph, listId, Number(argv['list-tasks']));
				console.log(JSON.stringify(tasks, null, 2));
			} catch (err) {
				console.error('list-tasks failed:', err instanceof Error ? err.message : String(err));
			}
			return;
		}

		if (argv.watch) {
			console.log('watch: placeholder — live watching not implemented by the lightweight CLI.');
			return;
		}

		if (argv['rcon-test']) {
			// Try to run an RCON test if env vars are present; otherwise print instructions.
			const { RCON_HOST, RCON_PORT, RCON_PASSWORD } = process.env;
			if (!RCON_HOST || !RCON_PORT || !RCON_PASSWORD) {
				console.error('RCON not configured. Set RCON_HOST, RCON_PORT, and RCON_PASSWORD in your environment.');
				return;
			}

			if (argv['dry-run']) {
				console.log('[dry-run] rcon-test: would send to', `${RCON_HOST}:${RCON_PORT}`, 'message:', argv['rcon-test']);
			} else {
				try {
					const { rconSend } = await import('./lib/sync-lib.mjs');
					const res = await rconSend({ host: RCON_HOST, port: RCON_PORT, password: RCON_PASSWORD, message: argv['rcon-test'] });
					console.log('rcon-test response:', res);
				} catch (err) {
					console.error('rcon-test failed:', err instanceof Error ? err.message : String(err));
				}
			}
			return;
		}

		if (argv.once) {
			// Process a changelog file once. Default to test/sample_changes.jsonl if not set.
			const changelog = process.env.CHANGELOG_FILE || path.join(path.dirname(__filename), 'test', 'sample_changes.jsonl');
			if (!fs.existsSync(changelog)) {
				console.error('Changelog file not found:', changelog);
				return;
			}
			const data = fs.readFileSync(changelog, { encoding: 'utf8' });
			const lines = data.split(/\r?\n/).filter(Boolean);
			for (const line of lines) {
				try {
					const obj = JSON.parse(line);
					console.log('Changelog entry:', obj);
				} catch (e) {
					console.error('Failed to parse line:', line, e instanceof Error ? e.message : e);
				}
			}
			return;
		}

		// If no recognized flags supplied, show help.
		yargs().showHelp();
	})();
}