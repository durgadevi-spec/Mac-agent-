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

test('uses fixed browser targets and a System Events front-window lookup', () => {
  assert.equal(MACOS_WINDOW_DETECTION_SCRIPT_VERSION, 2);
  assert.match(MACOS_WINDOW_DETECTION_SCRIPT, /first application process whose frontmost is true/);
  for (const browser of ['Google Chrome', 'Brave Browser', 'Microsoft Edge', 'Safari']) {
    assert.ok(MACOS_WINDOW_DETECTION_SCRIPT.includes(`tell application "${browser}"`));
  }
  assert.doesNotMatch(MACOS_WINDOW_DETECTION_SCRIPT, /tell application frontApp/);
});