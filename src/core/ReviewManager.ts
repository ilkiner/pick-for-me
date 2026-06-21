import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const RATED_KEY = '@pickforme:rated';
const COUNT_KEY = '@pickforme:resultCount';
const MIN_RESULTS = 5;

export async function trackResult(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(COUNT_KEY);
        const count = raw ? parseInt(raw, 10) : 0;
        await AsyncStorage.setItem(COUNT_KEY, String(count + 1));
    } catch {}
}

export async function maybeRequestReview(): Promise<void> {
    try {
        const [ratedRaw, countRaw] = await Promise.all([
            AsyncStorage.getItem(RATED_KEY),
            AsyncStorage.getItem(COUNT_KEY),
        ]);
        if (ratedRaw) return;
        const count = countRaw ? parseInt(countRaw, 10) : 0;
        if (count < MIN_RESULTS) return;
        const isAvailable = await StoreReview.isAvailableAsync();
        if (!isAvailable) return;
        await StoreReview.requestReview();
        await AsyncStorage.setItem(RATED_KEY, 'true');
    } catch {}
}
