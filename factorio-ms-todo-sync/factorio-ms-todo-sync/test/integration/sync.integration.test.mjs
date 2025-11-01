import assert from 'node:assert/strict';
import { createOrGetDefaultList, listTasks, createTask } from '../../lib/sync-lib.mjs';

// Mock graph client that implements the minimal chainable API used by the lib.
function makeMockGraph() {
  const storage = {
    lists: [{ id: 'list1', displayName: 'Default' }],
    tasks: { list1: [{ id: 't1', subject: 'existing' }] },
  };

  function api(path) {
    // simple path matching
    const parts = path.split('/').filter(Boolean);
    return {
      async get() {
        if (path === '/me/todo/lists') return { value: storage.lists };
        const m = path.match(/\/me\/todo\/lists\/(.+)\/tasks/);
        if (m) {
          const lid = m[1];
          return { value: storage.tasks[lid] || [] };
        }
        return {};
      },
      async post(body) {
        if (path === '/me/todo/lists') {
          const newList = { id: 'list2', displayName: body.displayName };
          storage.lists.push(newList);
          return newList;
        }
        const m = path.match(/\/me\/todo\/lists\/(.+)\/tasks/);
        if (m) {
          const lid = m[1];
          const t = { id: `t${Math.random().toString(36).slice(2,8)}`, ...body };
          storage.tasks[lid] = storage.tasks[lid] || [];
          storage.tasks[lid].push(t);
          return t;
        }
        return {};
      },
      top(n) { return this; },
    };
  }

  return { api };
}

(async () => {
  const mock = makeMockGraph();

  const listId = await createOrGetDefaultList(mock);
  assert.ok(listId, 'should return a list id');

  const tasks = await listTasks(mock, listId, 5);
  assert.ok(Array.isArray(tasks), 'tasks should be array');

  const newTask = await createTask(mock, listId, { subject: 'integration test task' });
  assert.ok(newTask && newTask.subject === 'integration test task', 'created task should match');

  console.log('sync.integration.test.mjs: OK');
})();
