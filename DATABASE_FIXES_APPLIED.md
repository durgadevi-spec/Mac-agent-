# Database Schema Fix Summary

## Issues Found

### 1. Missing `window_title` column in `activity_logs` table
- **Error**: `PGRST204 - Could not find the 'window_title' column of 'activity_logs' in the schema cache`
- **Cause**: Migration not applied to Supabase or schema out of sync
- **Fix**: Applied in migration `20260528_fix_schema_mismatches.sql`

### 2. Missing `url` column in `screenshots` table  
- **Error**: `23502 - null value in column "url" violates not-null constraint`
- **Cause**: Column not defined in migrations but exists in Supabase database
- **Fix**: Added `url` column with default empty string in migration

### 3. Screenshots not showing for admins
- **Cause**: 
  - `screenshot_data` contains base64 JPEG image data
  - Display logic needs this data properly formatted
  - `url` field is metadata (file reference), not the image
- **Status**: Should work once schema is fixed

## Changes Made

### 1. Database Migration (NEW FILE)
**File**: `supabase/migrations/20260528_fix_schema_mismatches.sql`
- Ensures `window_title` column exists in `activity_logs`
- Adds `url` column to `screenshots` table with default value
- Creates indexes for performance
- Ensures RLS policies exist

### 2. Code Updates

**File**: `src/lib/supabase.ts`
- Updated `Screenshot` interface to include optional `url` field
- Updated `createScreenshot()` function to accept and provide `url` parameter
- Sets default url as: `{app_name}-{timestamp}` if not provided

**File**: `src/lib/activitySyncService.ts`
- Updated screenshot upload logic to pass `url` parameter
- Generates url as: `screenshot-{app_name}-{timestamp}`
- Ensures all required database fields are populated

## Next Steps for User

1. **Apply the migration to Supabase**:
   - Upload and run: `supabase/migrations/20260528_fix_schema_mismatches.sql`
   - Or use Supabase CLI: `supabase migration up`

2. **Rebuild the application**:
   ```bash
   npm run build
   npm run build:windows  # if on Windows
   ```

3. **Verify**:
   - Restart the application
   - Check browser console for any new sync errors
   - Screenshots should now upload and display properly

## Technical Details

### Data Flow
1. Electron captures screenshot → base64 JPEG
2. React frontend calls `createScreenshot()` with base64 data
3. Data inserted into `screenshots` table (screenshot_data column)
4. Admin dashboard fetches screenshots and displays using `screenshot_data`
5. `url` field serves as metadata reference (e.g., filename or link)

### Column Purposes
- `screenshot_data`: Actual image data (base64 encoded JPEG)
- `url`: Metadata field for reference/linking
- Other fields: Context (app_name, captured_at, employee_id, session_id)
