import { createContext, useContext } from 'react';

// Supabase oturumu — null = misafir. Tek kaynak App.tsx'teki durum; ekranlar
// ayrı ayrı abone olmasın diye buradan okur.
export const AuthSessionContext = createContext<any>(null);

export function useAuthSession(): any {
    return useContext(AuthSessionContext);
}
