const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('timesheetAPI', {
  close: () => ipcRenderer.invoke('close-timesheet-browser'),
  openPms: () => ipcRenderer.invoke('open-pms-from-timesheet'),
});