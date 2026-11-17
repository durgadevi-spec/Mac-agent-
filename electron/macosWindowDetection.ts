export const MACOS_WINDOW_DETECTION_SCRIPT_VERSION = 5;

export const MACOS_WINDOW_DETECTION_SCRIPT = `set frontApp to ""
set windowTitle to ""
set documentUrl to ""
set titleError to ""

tell application "System Events"
    set frontProcess to first application process whose frontmost is true
    set frontApp to name of frontProcess
    try
        set windowTitle to name of window 1 of frontProcess
    on error errorMessage number errorNumber
        set titleError to (errorNumber as text) & ": " & errorMessage
    end try
    try
        set documentUrl to value of attribute "AXDocument" of window 1 of frontProcess as text
    end try
end tell

return frontApp & (character id 30) & windowTitle & (character id 30) & documentUrl & (character id 30) & titleError`;

export interface MacWindowDetectionResult {
  ownerName: string;
  windowTitle: string;
  documentUrl?: string;
  error?: string;
}

export function parseMacWindowDetectionOutput(output: string): MacWindowDetectionResult | null {
  const firstSeparator = output.indexOf('\u001e');
  if (firstSeparator < 0) return null;

  const secondSeparator = output.indexOf('\u001e', firstSeparator + 1);
  if (secondSeparator < 0) return null;
  const thirdSeparator = output.indexOf('\u001e', secondSeparator + 1);

  const ownerName = output.slice(0, firstSeparator).trim();
  if (!ownerName) return null;

  return {
    ownerName,
    windowTitle: output.slice(firstSeparator + 1, secondSeparator).trim() || 'Unknown',
    ...(thirdSeparator >= 0
      ? { documentUrl: output.slice(secondSeparator + 1, thirdSeparator).trim() || undefined }
      : {}),
    error: output.slice(thirdSeparator >= 0 ? thirdSeparator + 1 : secondSeparator + 1).trim() || undefined,
  };
}

export function getMacOSDocumentName(documentUrl?: string): string | undefined {
  if (!documentUrl?.trim()) return undefined;

  let documentPath = documentUrl.trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(documentPath)) {
    try {
      const url = new URL(documentPath);
      if (url.protocol !== 'file:') return undefined;
      documentPath = decodeURIComponent(url.pathname);
    } catch {
      return undefined;
    }
  }

  const documentName = documentPath.replace(/[?#].*$/, '').split(/[\\/]/).pop()?.trim();
  return documentName || undefined;
}

const MACOS_BROWSER_TITLE_SCRIPTS: Record<string, string> = {
  Chrome: 'tell application "Google Chrome" to get title of active tab of front window',
  Brave: 'tell application "Brave Browser" to get title of active tab of front window',
  'Microsoft Edge': 'tell application "Microsoft Edge" to get title of active tab of front window',
  Safari: 'tell application "Safari" to get name of front document',
};

export function getMacOSBrowserTitleScript(appName: string): string | undefined {
  return MACOS_BROWSER_TITLE_SCRIPTS[appName];
}

export function getMacOSExcelWorkbookNameScript(appName: string): string | undefined {
  if (appName !== 'Excel') return undefined;
  return 'tell application "Microsoft Excel" to get name of active workbook';
}