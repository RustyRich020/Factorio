import fs from 'node:fs';
import path from 'node:path';

/**
 * Device-code auth using MSAL with a simple file-backed cache.
 * config: { clientId, tenantId, scopes: [], tokenCacheFile }
 */
export async function deviceCodeAuth(config = {}) {
  const { clientId, tenantId = 'common', scopes = ['Tasks.ReadWrite'], tokenCacheFile = '.cache/msal_cache.json' } = config;
  const { PublicClientApplication } = await import('@azure/msal-node');

  // Simple cache plugin that reads/writes a file containing serialized cache
  const cachePlugin = {
    beforeCacheAccess: async (cacheContext) => {
      try {
        if (fs.existsSync(tokenCacheFile)) {
          const cache = fs.readFileSync(tokenCacheFile, 'utf8');
          cacheContext.tokenCache.deserialize(cache);
        }
      } catch (e) {
        // ignore cache errors
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        try {
          const dir = path.dirname(tokenCacheFile);
          if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(tokenCacheFile, cacheContext.tokenCache.serialize());
        } catch (e) {
          // ignore write errors
        }
      }
    },
  };

  const pca = new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: { cachePlugin },
  });

  const deviceCodeRequest = {
    deviceCodeCallback: (response) => {
      // Print instructions to the console when running interactively
      console.log(response.message);
    },
    scopes,
  };

  const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  return tokenResponse.accessToken;
}

/**
 * Create a Microsoft Graph client with a simple authProvider using the provided access token.
 */
export function createGraphClient(accessToken) {
  const { Client } = require('@microsoft/microsoft-graph-client');
  // lightweight auth provider
  const client = Client.init({
    authProvider: (done) => done(null, accessToken),
  });
  return client;
}

/**
 * Ensure there's a default list and return its id. Creates a 'Factorio' list if none found.
 * graphClient should be the Graph client instance.
 */
export async function createOrGetDefaultList(graphClient) {
  const lists = await graphClient.api('/me/todo/lists').get();
  if (lists && Array.isArray(lists.value) && lists.value.length > 0) {
    return lists.value[0].id;
  }
  // create a list named 'Factorio'
  const created = await graphClient.api('/me/todo/lists').post({ displayName: 'Factorio' });
  return created.id;
}

export async function listTasks(graphClient, listId, top = 10) {
  const res = await graphClient.api(`/me/todo/lists/${listId}/tasks`).top(top).get();
  return res.value || [];
}

export async function createTask(graphClient, listId, task) {
  const created = await graphClient.api(`/me/todo/lists/${listId}/tasks`).post(task);
  return created;
}

/**
 * Send a single RCON message. Returns the response string.
 */
export async function rconSend({ host, port, password, message }) {
  const { Rcon } = await import('rcon-client');
  const client = await Rcon.connect({ host, port: Number(port), password });
  try {
    const res = await client.send(message);
    await client.end();
    return res;
  } finally {
    try { client.end(); } catch (e) {}
  }
}
