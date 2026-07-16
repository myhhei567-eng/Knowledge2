const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('knowledge', {
  loadWorkspace: () => ipcRenderer.invoke('workspace:load'),
  chooseVault: () => ipcRenderer.invoke('workspace:choose'),
  saveSettings: (settings) => ipcRenderer.invoke('workspace:save-settings', settings),
  saveNote: (note) => ipcRenderer.invoke('notes:save', note),
  deleteNote: (noteId) => ipcRenderer.invoke('notes:delete', noteId),
  attachFile: (noteId) => ipcRenderer.invoke('attachments:pick', noteId),
  configureAi: (config) => ipcRenderer.invoke('ai:configure', config),
  runAi: (request) => ipcRenderer.invoke('ai:run', request),
});
