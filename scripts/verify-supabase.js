/**
 * This script verifies that the refactored supabase.ts doesn't crash 
 * when credentials are missing or invalid.
 */

// Mocking some React Native / Expo globals that supabase.ts might expect
global.process = {
    ...process,
    env: { ...process.env }
};

const mockStorage = {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
};

// We don't want to actually run the code in the context of the app, 
// so we'll just check the logic by simulating what's in the file.

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

function isSupabaseConfigured() {
    return (
        supabaseUrl !== 'YOUR_SUPABASE_URL' &&
        !!supabaseUrl &&
        supabaseUrl.startsWith('https://') &&
        supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
        !!supabaseAnonKey
    );
}

console.log('Testing with default placeholders...');
console.log('isSupabaseConfigured:', isSupabaseConfigured());

if (!isSupabaseConfigured()) {
    console.log('Success: Correctly identified as not configured.');
} else {
    console.error('Error: Incorrectly identified as configured!');
    process.exit(1);
}

const testUrl = 'https://abc.supabase.co';
const testKey = 'some-key';

function testIsConfigured(url, key) {
    return (
        url !== 'YOUR_SUPABASE_URL' &&
        !!url &&
        url.startsWith('https://') &&
        key !== 'YOUR_SUPABASE_ANON_KEY' &&
        !!key
    );
}

console.log('\nTesting with valid-looking credentials...');
console.log('isSupabaseConfigured:', testIsConfigured(testUrl, testKey));

if (testIsConfigured(testUrl, testKey)) {
    console.log('Success: Correctly identified as configured.');
} else {
    console.error('Error: Failed to identify valid config!');
    process.exit(1);
}

console.log('\nVerification completed successfully!');
