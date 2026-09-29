import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyboard } from 'react-native';
import * as StoreReview from 'expo-store-review';

const RATED_KEY = '@pickforme:rated';
const COUNT_KEY = '@pickforme:resultCount';
const MIN_RESULTS = 5;

// Klavyenin kapanma animasyonu. Hemen ardından istem açılırsa klavye hâlâ
// ekranda oluyor ve istemin altını örtüyor.
const KEYBOARD_SETTLE_MS = 350;

/** Sonuç sayacını artırır ve YENİ toplamı döndürür (hata durumunda 0). */
export async function trackResult(): Promise<number> {
    try {
        const raw = await AsyncStorage.getItem(COUNT_KEY);
        const count = (raw ? parseInt(raw, 10) : 0) + 1;
        await AsyncStorage.setItem(COUNT_KEY, String(count));
        return count;
    } catch {
        return 0;
    }
}

/**
 * Puanlama istemini gösterir. Gösterildiyse true döner — çağıran taraf aynı
 * anda başka bir tam ekran (interstitial) açmasın diye bilmek zorunda.
 */
export async function maybeRequestReview(): Promise<boolean> {
    try {
        const [ratedRaw, countRaw] = await Promise.all([
            AsyncStorage.getItem(RATED_KEY),
            AsyncStorage.getItem(COUNT_KEY),
        ]);
        if (ratedRaw) return false;
        const count = countRaw ? parseInt(countRaw, 10) : 0;
        if (count < MIN_RESULTS) return false;
        const isAvailable = await StoreReview.isAvailableAsync();
        if (!isAvailable) return false;

        // Klavye açıkken istemi AÇMA. Bu istem Google Play'in kendi diyaloğu:
        // konumunu, boyutunu, hiçbir şeyini biz belirleyemiyoruz. Sonuç ekranına
        // bir metin alanından gelindiğinde (Çarkıfelek'te seçenek yazıp çevirmek
        // gibi) klavye açık kalıyor ve diyaloğun onay düğmesinin üstüne biniyor —
        // kullanıcı puan veremiyor, kapatamıyor da.
        //
        // dismiss() eşzamanlı dönüyor ama klavye ~250ms boyunca kayarak
        // kapanıyor; beklemeden açarsak istem yine klavyenin üstüne denk gelir.
        Keyboard.dismiss();
        await new Promise(resolve => setTimeout(resolve, KEYBOARD_SETTLE_MS));

        await StoreReview.requestReview();
        await AsyncStorage.setItem(RATED_KEY, 'true');
        return true;
    } catch {
        return false;
    }
}
