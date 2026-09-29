export const MACOS_WINDOW_DETECTION_SCRIPT_VERSION = 3;

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