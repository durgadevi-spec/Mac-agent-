import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MACOS_WINDOW_DETECTION_SCRIPT,
  MACOS_WINDOW_DETECTION_SCRIPT_VERSION,
  getMacOSBrowserTitleScript,
  getMacOSDocumentName,
  getMacOSExcelWorkbookNameScript,
  parseMacWindowDetectionOutput,
} from '../dist/electron/macosWindowDetection.js';

test('parses an application and title returned by AppleScript', () => {
  assert.deepEqual(
    parseMacWindowDetectionOutput('Google Chrome\u001eChatGPT: Chat\u001e'),
    { ownerName: 'Google Chrome', windowTitle: 'ChatGPT: Chat', error: undefined },
  );
});

test('preserves a detected app and reports a title lookup error', () => {
  assert.deepEqual(
    parseMacWindowDetectionOutput('Terminal\u001eUnknown\u001e-1719: No window'),
    { ownerName: 'Terminal', windowTitle: 'Unknown', error: '-1719: No window' },
  );
});

test('parses an accessible document URL for any frontmost application', () => {
  assert.deepEqual(
    parseMacWindowDetectionOutput('TextEdit\u001eTextEdit\u001efile:///Users/employee/Notes%20for%20work.rtf\u001e'),
    {
      ownerName: 'TextEdit',
      windowTitle: 'TextEdit',
      documentUrl: 'file:///Users/employee/Notes%20for%20work.rtf',
      error: undefined,
    },
  );
  assert.equal(getMacOSDocumentName('file:///Users/employee/Notes%20for%20work.rtf'), 'Notes for work.rtf');
  assert.equal(getMacOSDocumentName('https://example.com/report'), undefined);
});

test('rejects malformed AppleScript output rather than silently returning Unknown', () => {
  assert.equal(parseMacWindowDetectionOutput('Unknown|Unknown'), null);
  assert.equal(parseMacWindowDetectionOutput('\u001eUnknown\u001e'), null);
});

test('uses System Events for all foreground window titles without application dictionaries', () => {
  assert.equal(MACOS_WINDOW_DETECTION_SCRIPT_VERSION, 5);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /first application process whose frontmost is true/);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /name of window 1 of frontProcess/);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /attribute "AXDocument"/);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /tell application "System Events"/);
  assert.doesNotMatch(MACOS_WINDOW_DETECTION_SCRIPT, /tell application frontApp/);
  assert.doesNotMatch(MACOS_WINDOW_DETECTION_SCRIPT, /active tab|front document/);
});

test('provides fixed runtime scripts for supported browser tab titles', () => {
  assert.equal(getMacOSBrowserTitleScript('Chrome'), 'tell application "Google Chrome" to get title of active tab of front window');
  assert.equal(getMacOSBrowserTitleScript('Brave'), 'tell application "Brave Browser" to get title of active tab of front window');
  assert.equal(getMacOSBrowserTitleScript('Microsoft Edge'), 'tell application "Microsoft Edge" to get title of active tab of front window');
  assert.equal(getMacOSBrowserTitleScript('Safari'), 'tell application "Safari" to get name of front document');
  assert.equal(getMacOSBrowserTitleScript('Finder'), undefined);
});

test('provides the active Excel workbook name script only for Excel', () => {
  assert.equal(
    getMacOSExcelWorkbookNameScript('Excel'),
    'tell application "Microsoft Excel" to get name of active workbook',
  );
  assert.equal(getMacOSExcelWorkbookNameScript('Word'), undefined);
});