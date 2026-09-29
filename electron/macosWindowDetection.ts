export const MACOS_WINDOW_DETECTION_SCRIPT_VERSION = 2;

export const MACOS_WINDOW_DETECTION_SCRIPT = `set frontApp to ""
set windowTitle to ""
set titleError to ""

tell application "System Events"
    set frontProcess to first application process whose frontmost is true
    set frontApp to name of frontProcess
    try
        set windowTitle to name of window 1 of frontProcess
    on error errorMessage number errorNumber
        set titleError to (errorNumber as text) & ": " & errorMessage
    end try
end tell

if frontApp is "Google Chrome" then
    try
        tell application "Google Chrome"
            set browserTitle to title of active tab of front window
        end tell
        if browserTitle is not "" then set windowTitle to browserTitle
    on error errorMessage number errorNumber
        if titleError is "" then set titleError to (errorNumber as text) & ": " & errorMessage
    end try
else if frontApp is "Brave Browser" then
    try
        tell application "Brave Browser"
            set browserTitle to title of active tab of front window
        end tell
        if browserTitle is not "" then set windowTitle to browserTitle
    on error errorMessage number errorNumber
        if titleError is "" then set titleError to (errorNumber as text) & ": " & errorMessage
    end try
else if frontApp is "Microsoft Edge" then
    try
        tell application "Microsoft Edge"
            set browserTitle to title of active tab of front window
        end tell
        if browserTitle is not "" then set windowTitle to browserTitle
    on error errorMessage number errorNumber
        if titleError is "" then set titleError to (errorNumber as text) & ": " & errorMessage
    end try
else if frontApp is "Safari" then
    try
        tell application "Safari"
            set browserTitle to name of front document
        end tell
        if browserTitle is not "" then set windowTitle to browserTitle
    on error errorMessage number errorNumber
        if titleError is "" then set titleError to (errorNumber as text) & ": " & errorMessage
    end try
end if

return frontApp & (character id 30) & windowTitle & (character id 30) & titleError`;

export interface MacWindowDetectionResult {
  ownerName: string;
  windowTitle: string;
  error?: string;
}

export function parseMacWindowDetectionOutput(output: string): MacWindowDetectionResult | null {
  const firstSeparator = output.indexOf('\u001e');
  if (firstSeparator < 0) return null;

  const secondSeparator = output.indexOf('\u001e', firstSeparator + 1);
  if (secondSeparator < 0) return null;

  const ownerName = output.slice(0, firstSeparator).trim();
  if (!ownerName) return null;

  return {
    ownerName,
    windowTitle: output.slice(firstSeparator + 1, secondSeparator).trim() || 'Unknown',
    error: output.slice(secondSeparator + 1).trim() || undefined,
  };
}