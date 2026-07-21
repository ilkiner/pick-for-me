import AsyncStorage from '@react-native-async-storage/async-storage';
import ALL_CHALLENGES from '../content/challenges.json';

// Günün Görevi: tarihten (yerel YYYY-MM-DD) deterministik seed üretilir,
// o gün HERKESTE aynı görev seçilir. Gece 00:00'da (yerel) değişir.

export type ChallengeCategory = 'home' | 'sport' | 'social' | 'productivity' | 'fun' | 'selfcare';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DailyChallenge {
    id: string;
    category: ChallengeCategory;
    difficulty: Difficulty;
    text_tr: string;
    text_en: string;
    text_es: string;
    suggestedSeconds?: number;
}

const CHALLENGES = ALL_CHALLENGES as DailyChallenge[];

// Sürüm tuzu: içerik listesi büyüyünce v2 yaparak herkes için aynı anda
// yeni bir rotasyon başlatılabilir.
const DAILY_SALT = 'pfm-daily-v1';

// Cihazın YEREL gününü YYYY-MM-DD olarak verir (UTC değil — görev
// kullanıcının kendi gece yarısında değişmeli).
export function dateKey(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// FNV-1a: bağımlılıksız, platformdan bağımsız deterministik string hash.
function fnv1a(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
    const seed = fnv1a(`${DAILY_SALT}:${dateKey(date)}`);
    return CHALLENGES[seed % CHALLENGES.length];
}

// --- Tamamlanma durumu (cihazda, tarihle) ---

const DAILY_DONE_KEY = '@daily_challenge_done_v1';

export async function isDailyCompleted(date: Date = new Date()): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(DAILY_DONE_KEY);
        if (!raw) return false;
        const { date: doneDate } = JSON.parse(raw);
        return doneDate === dateKey(date);
    } catch {
        return false;
    }
}

export async function markDailyCompleted(date: Date = new Date()): Promise<void> {
    try {
        await AsyncStorage.setItem(DAILY_DONE_KEY, JSON.stringify({ date: dateKey(date) }));
    } catch {
        // storage hatasında sessiz geç — kart bir sonraki açılışta yine tamamlanabilir
    }
}
