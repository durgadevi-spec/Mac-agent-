#!/usr/bin/env node

/**
 * Chrome Website Tracking Verification Script
 * 
 * Run this in the Electron main process console or Node.js terminal
 * to verify website tracking is working correctly.
 */

// Test 1: Verify URL parsing function
console.log('\n=== TEST 1: URL Parsing ===');
const testUrls = [
  'https://www.github.com/user/repo',
  'https://api.github.com/repos',
  'https://mail.google.com',
  'http://localhost:3000',
  'https://example.co.uk/path',
  'chrome://extensions',
  'about:blank',
];

function testParseWebsite(url) {
  try {
    const urlStr = url;
    let urlToParse = urlStr;
    if (!urlStr.startsWith('http')) {
      urlToParse = 'https://' + urlStr;
    }
    
    const u = new URL(urlToParse);
    let hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    
    if (hostname.includes('.')) {
      const parts = hostname.split('.');
      if (parts.length > 2) {
        const commonMultiPartTlds = ['co.uk', 'com.au', 'co.nz', 'gov.uk', 'co.jp'];
        const lastTwo = parts.slice(-2).join('.');
        const lastThree = parts.slice(-3).join('.');
        if (commonMultiPartTlds.some(tld => lastThree.endsWith(tld))) {
          hostname = lastThree;
        } else {
          hostname = lastTwo;
        }
      }
    }
    
    return hostname;
  } catch (e) {
    return null;
  }
}

testUrls.forEach(url => {
  const result = testParseWebsite(url);
  console.log(`  ${url.padEnd(40)} → ${result || '(filtered)'}`);
});

// Test 2: Verify localStorage for sync tracking
console.log('\n=== TEST 2: Activity Sync State ===');
if (typeof localStorage !== 'undefined') {
  const lastSyncTime = localStorage.getItem('lastSyncedLogTime');
  console.log(`  Last synced log time: ${lastSyncTime || '(not set)'}`);
} else {
  console.log('  (localStorage not available in this context)');
}

// Test 3: Check if activity logs have website field
console.log('\n=== TEST 3: Activity Log Structure ===');
const exampleLog = {
  appName: 'Chrome',
  windowTitle: 'GitHub - Notifications',
  website: 'github.com',
  type: 'app',
  productive: true,
  startTime: new Date().toISOString(),
  durationSeconds: 120
};
console.log('  Sample activity log structure:');
console.log(JSON.stringify(exampleLog, null, 2));

// Test 4: Manual endpoint test
console.log('\n=== TEST 4: Manual Browser Event Test ===');
console.log('  To test the /browser-event endpoint manually:');
console.log('  ');
console.log('  Windows (PowerShell):');
console.log('  $data = @{url="https://github.com"; title="GitHub"} | ConvertTo-Json');
console.log('  Invoke-WebRequest -Uri "http://localhost:5014/browser-event" -Method POST -Headers @{"Content-Type"="application/json"} -Body $data');
console.log('  ');
console.log('  Mac/Linux (bash):');
console.log('  curl -X POST http://localhost:5014/browser-event \\');
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"url":"https://github.com","title":"GitHub"}\'');

// Test 5: Database query to check website data
console.log('\n=== TEST 5: Database Query for Website Data ===');
console.log('  Run this in Supabase SQL Editor:');
console.log('  ');
console.log('  SELECT app_name, website, window_title, logged_at');
console.log('  FROM activity_logs');
console.log('  WHERE app_name ILIKE \'%chrome%\'');
console.log('    OR app_name ILIKE \'%edge%\'');
console.log('    OR app_name ILIKE \'%firefox%\'');
console.log('  ORDER BY logged_at DESC');
console.log('  LIMIT 20;');

// Test 6: Chrome Extension verification
console.log('\n=== TEST 6: Chrome Extension Verification ===');
console.log('  Checklist:');
console.log('  1. Open chrome://extensions');
console.log('  2. Enable "Developer mode" (top-right)');
console.log('  3. Look for "Knockturn Monitor" extension');
console.log('  4. Verify status shows "Enabled"');
console.log('  5. Check "Details" → "Permissions" includes:');
console.log('     - activeTab');
console.log('     - tabs');

// Test 7: Monitoring dashboard verification
console.log('\n=== TEST 7: Monitoring Dashboard Verification ===');
console.log('  Expected display format for Chrome activity:');
console.log('  ');
console.log('  ✅ With website data: "Chrome • github.com (GitHub - Notifications)"');
console.log('  ❌ Without website data: "Chrome • GitHub - Notifications"');
console.log('  ');
console.log('  If you see the ❌ format, website tracking needs debugging.');

console.log('\n=== Verification Complete ===\n');
