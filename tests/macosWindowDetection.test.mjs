import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MACOS_WINDOW_DETECTION_SCRIPT,
  MACOS_WINDOW_DETECTION_SCRIPT_VERSION,
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

test('rejects malformed AppleScript output rather than silently returning Unknown', () => {
  assert.equal(parseMacWindowDetectionOutput('Unknown|Unknown'), null);
  assert.equal(parseMacWindowDetectionOutput('\u001eUnknown\u001e'), null);
});

test('uses System Events for all foreground window titles without application dictionaries', () => {
  assert.equal(MACOS_WINDOW_DETECTION_SCRIPT_VERSION, 3);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /first application process whose frontmost is true/);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /name of window 1 of frontProcess/);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /tell application "System Events"/);
  assert.doesNotMatch(MACOS_WINDOW_DETECTION_SCRIPT, /tell application frontApp/);
  assert.doesNotMatch(MACOS_WINDOW_DETECTION_SCRIPT, /active tab|front document/);
});