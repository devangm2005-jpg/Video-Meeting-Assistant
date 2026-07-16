const KEY = "reelmark.workspaces";

export function listWorkspaces() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorkspace(entry) {
  const items = listWorkspaces().filter((w) => w.jobId !== entry.jobId);
  items.unshift({ ...entry, updatedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
}

export function updateWorkspace(jobId, patch) {
  const items = listWorkspaces();
  const idx = items.findIndex((w) => w.jobId === jobId);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...patch, updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(items));
  }
}

export function getWorkspace(jobId) {
  return listWorkspaces().find((w) => w.jobId === jobId) || null;
}

export function removeWorkspace(jobId) {
  const items = listWorkspaces().filter((w) => w.jobId !== jobId);
  localStorage.setItem(KEY, JSON.stringify(items));
}
