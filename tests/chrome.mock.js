// TEST ONLY: browser API adapter for running the production panel and background
// bundle in a browser without extension support. Never copied into dist/.
(() => {
  const event = () => {
    const listeners = new Set();
    return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), emit: (...args) => { for (const fn of listeners) fn(...args); } };
  };
  const origin = location.origin;
  const changed = event();
  let data = JSON.parse(localStorage.getItem('test:chrome-local') || '{}');
  let session = {};
  const fixture = [
    ['ChatGPT', 'https://chatgpt.com/'],
    ['6 Minute English — BBC Learning English', 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english'],
    ['Junior .NET Developer — Acme', 'https://www.linkedin.com/jobs/view/12345'],
    ['Building accessible forms', 'https://web.dev/learn/forms/'],
    ['React course · Full playlist', 'https://www.youtube.com/playlist?list=demo'],
    ['selinpir / zoonlogos', 'https://github.com/selinpir/zoonlogos'],
    ['Inbox — Gmail', 'https://mail.google.com/mail/u/0/']
  ];
  let tabs = JSON.parse(localStorage.getItem('test:chrome-tabs') || 'null') ?? fixture.map(([title, url], i) => ({ id: i + 1, windowId: 1, index: i, title, url, active: i === 0, pinned: false, incognito: false, groupId: -1 }));
  let groups = [];
  const persistTabs = () => localStorage.setItem('test:chrome-tabs', JSON.stringify(tabs));
  const apiEventNames = ['onCreated', 'onUpdated', 'onRemoved', 'onActivated', 'onAttached', 'onDetached', 'onMoved'];
  const tabEvents = Object.fromEntries(apiEventNames.map(name => [name, event()]));
  const controls = { failWrites: false, panelBehavior: null, groups: () => groups };
  const area = kind => ({
    async get(keys) {
      const store = kind === 'local' ? data : session;
      const selected = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(store);
      return structuredClone(Object.fromEntries(selected.map(key => [key, store[key]])));
    },
    async set(next) {
      if (kind === 'local' && controls.failWrites) throw new Error('QUOTA_BYTES exceeded (test)');
      const store = kind === 'local' ? data : session;
      const change = Object.fromEntries(Object.entries(next).map(([key, value]) => [key, { oldValue: store[key], newValue: structuredClone(value) }]));
      Object.assign(store, structuredClone(next));
      if (kind === 'local') localStorage.setItem('test:chrome-local', JSON.stringify(data));
      changed.emit(change, kind);
    },
    async setAccessLevel() {}
  });
  let messageListener;
  let ready;
  const listenerReady = new Promise(resolve => { ready = resolve; });
  globalThis.chrome = {
    __testing: controls,
    runtime: {
      id: 'tabshelf-test-adapter',
      getURL: path => `${origin}/${path}`,
      onInstalled: { addListener(fn) { setTimeout(fn, 0); } },
      onStartup: event(),
      onMessage: { addListener(fn) { messageListener = fn; ready(); } },
      async sendMessage(message) {
        await listenerReady;
        return new Promise(resolve => messageListener(message, { id: 'tabshelf-test-adapter', url: `${origin}/sidepanel.html` }, resolve));
      }
    },
    storage: { local: area('local'), session: area('session'), onChanged: changed },
    sidePanel: { async setPanelBehavior(value) { controls.panelBehavior = value; } },
    windows: { async getCurrent() { return { id: 1 }; }, async update(id) { return { id }; } },
    tabs: {
      ...tabEvents,
      async query(query = {}) { return structuredClone(tabs.filter(t => query.windowId === undefined || query.windowId === t.windowId)); },
      async get(id) { const tab = tabs.find(t => t.id === id); if (!tab) throw new Error('No tab with id ' + id); return structuredClone(tab); },
      async remove(id) {
        if (!tabs.some(t => t.id === id)) throw new Error('No tab with id ' + id);
        tabs = tabs.filter(t => t.id !== id); persistTabs(); tabEvents.onRemoved.emit(id, { windowId: 1, isWindowClosing: false });
      },
      async update(id, update) {
        const tab = tabs.find(t => t.id === id); if (!tab) throw new Error('No tab with id ' + id);
        if (update.active) tabs.forEach(t => { t.active = false; });
        Object.assign(tab, update); persistTabs(); tabEvents.onUpdated.emit(id, update, structuredClone(tab)); return structuredClone(tab);
      },
      async create({ url, windowId = 1, active = true }) {
        const tab = { id: Math.max(100, ...tabs.map(t => t.id)) + 1, windowId, url, title: new URL(url).hostname, active, pinned: false, incognito: false, groupId: -1 };
        tabs.push(tab); persistTabs(); tabEvents.onCreated.emit(structuredClone(tab)); return structuredClone(tab);
      },
      async group({ tabIds, groupId, createProperties }) {
        const id = groupId ?? groups.length + 1;
        if (groupId === undefined) groups.push({ id, windowId: createProperties.windowId });
        tabs.filter(t => tabIds.includes(t.id)).forEach(t => { t.groupId = id; });
        return id;
      }
    },
    tabGroups: {
      async get(id) { const group = groups.find(g => g.id === id); if (!group) throw new Error('No group'); return structuredClone(group); },
      async update(id, changes) { const group = groups.find(g => g.id === id); Object.assign(group, changes); return structuredClone(group); }
    }
  };
})();
