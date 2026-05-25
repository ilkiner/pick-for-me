import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        return SecureStore.deleteItemAsync(key);
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

/** Returns true if Supabase has real credentials configured */
export function isSupabaseConfigured(): boolean {
    return (
        supabaseUrl !== 'YOUR_SUPABASE_URL' &&
        !!supabaseUrl &&
        supabaseUrl.startsWith('https://') &&
        supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
        !!supabaseAnonKey
    );
}

// Safer initialization to prevent top-level crash when credentials are missing
let supabaseInstance: any;

if (isSupabaseConfigured()) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter as any,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        supabaseInstance = null;
    }
} else {
    // Minimal mock to prevent crashes when methods are accessed before checking configuration
    supabaseInstance = {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signOut: () => Promise.resolve({ error: null }),
            signInWithPassword: () => Promise.resolve({ error: new Error('Supabase not configured') }),
            signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        }
    };
}

export const supabase = supabaseInstance;
