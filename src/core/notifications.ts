// Geri dönüş hatırlatıcıları — TAMAMEN CİHAZDA.
//
// Sunucu ya da FCM yok: hiçbir token üretilmiyor, hiçbir şey ağa çıkmıyor.
// Bildirimlerin metni planlanma ANINDA yazılıyor, yani uygulama dili
// değiştiğinde yeniden planlamak ZORUNDAYIZ — yoksa kullanıcı dili Türkçe'ye
// alır, bildirimi İngilizce alır.
//
// İki hatırlatıcı var:
//
//   daily_challenge — her gün DAILY_HOUR'da "günün görevi hazır".
//   inactivity      — son açılıştan 3 ve 7 gün sonra birer nazik dürtme.
//
// Günlük olan neden tekrarlayan (DAILY) tetikleyici DEĞİL: "kullanıcı o gün
// görevi tamamladıysa gönderme" kuralı teslim anında karar vermeyi gerektirir,
// yerel bildirimlerde ise teslim anında kodumuz çalışmaz. Bunun yerine önümüzdeki
// DAILY_HORIZON_DAYS gün için TEK SEFERLİK bildirimler kuruyoruz ve uygulama her
// açıldığında (ayrıca görev tamamlanınca) listeyi baştan kuruyoruz. Bugünün
// bildirimi, görev tamamlanmışsa hiç kurulmuyor.
//
// Ufkun 7 günle sınırlı olması aynı zamanda spam freni: uygulamayı bir hafta
// açmayan birine günlük hatırlatıcı yağmaya devam etmiyor, elinde yalnızca
// 3. ve 7. gün dürtmeleri kalıyor.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { isDailyCompleted } from './daily';

export type ReminderKind = 'daily_challenge' | 'inactivity';

/** Günlük hatırlatıcının yerel saati (24s). Akşam: gün içinde yapılacak vakit kalsın. */
const DAILY_HOUR = 19;
/** Kaç gün ileriye kurulacak. Aynı zamanda hareketsiz kullanıcıda üst sınır. */
const DAILY_HORIZON_DAYS = 7;
/** Hareketsizlik dürtmeleri: son açılıştan kaç gün sonra. Sonrası YOK. */
const INACTIVITY_DAYS = [3, 7];

const ENABLED_KEY = '@pickforme:notifEnabled';
const PERMISSION_ASKED_KEY = '@pickforme:notifPermissionAsked';

const ANDROID_CHANNEL_ID = 'reminders';

/**
 * Uygulama ön plandayken gelen bildirim.
 *
 * Ses kapalı: kullanıcı zaten uygulamanın içinde, hatırlatıcının bir de
 * çalmasına gerek yok. Android'de `shouldPlaySound: false` başlığın üstte
 * belirmesini de engelliyor (platformun kendi davranışı) — istediğimiz bu,
 * bildirim yine de çekmecede duruyor.
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

/** Android'de kanal olmadan bildirim görünmez; açılışta bir kez kurulur. */
export async function configureNotifications(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: i18n.t('notifications.channel_name', 'Reminders'),
            importance: Notifications.AndroidImportance.DEFAULT,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0, 250],
        });
    } catch {
        // Kanal kurulamadıysa bildirim de görünmez; kullanıcıya yansıtacak bir
        // şey yok, uygulamanın geri kalanı etkilenmemeli.
    }
}

// ─── Tercih ve izin durumu ───────────────────────────────────────────────────

/**
 * Kullanıcının uygulama içi tercihi.
 *
 * Varsayılan KAPALI ve bu bilinçli: Android 12 ve öncesinde POST_NOTIFICATIONS
 * izni yok, yani işletim sistemi "izin verili" diyor. Tercih açık başlasaydı o
 * cihazlarda kullanıcı daha hiçbir şey onaylamadan hatırlatıcı almaya başlardı.
 * Anahtarı açan tek şey kullanıcının kendisi: ilk görevden sonraki soru ya da
 * Ayarlar'daki düğme.
 */
export async function getPreferenceEnabled(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
    } catch {
        return false;
    }
}

export async function setPreferenceEnabled(enabled: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
    } catch {
        // Tercih yazılamadıysa bu oturumda geçerli, açılışta varsayılana döner
    }
}

export async function isPermissionGranted(): Promise<boolean> {
    try {
        const { granted } = await Notifications.getPermissionsAsync();
        return granted;
    } catch {
        return false;
    }
}

export async function hasAskedPermission(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) === 'true';
    } catch {
        return false;
    }
}

export async function markPermissionAsked(): Promise<void> {
    try {
        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    } catch {
        // Yazılamazsa en kötü ihtimalle bir kez daha sorulur
    }
}

/**
 * İşletim sistemi iznini ister. İsteyen taraf ne olursa olsun bunu BİR KEZ
 * çağırmalı: Android 13+ ikinci kez sormayı zaten kalıcı olarak reddediyor ve
 * biz de ısrar etmiyoruz.
 */
export async function requestPermission(): Promise<boolean> {
    try {
        const { granted } = await Notifications.requestPermissionsAsync();
        return granted;
    } catch {
        return false;
    }
}

// ─── Planlama ────────────────────────────────────────────────────────────────

function reminderKindOf(request: Notifications.NotificationRequest): ReminderKind | null {
    const kind = (request.content?.data as any)?.kind;
    return kind === 'daily_challenge' || kind === 'inactivity' ? kind : null;
}

/**
 * Bizim kurduğumuz bildirimleri iptal eder.
 *
 * Yalnızca `data.kind` taşıyanlara dokunuyoruz — cancelAllScheduledNotificationsAsync
 * başka bir yerin (bugün olmasa da yarın) kurduğu her şeyi de siler.
 */
async function cancelScheduled(kinds: ReminderKind[]): Promise<void> {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
            scheduled
                .filter(n => {
                    const kind = reminderKindOf(n);
                    return kind !== null && kinds.includes(kind);
                })
                .map(n =>
                    Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}),
                ),
        );
    } catch {
        // Liste okunamadıysa yeniden planlamayı denemek çift bildirim üretebilir;
        // bu yüzden çağıran taraf hatayı yutup devam ediyor.
    }
}

async function schedule(
    kind: ReminderKind,
    date: Date,
    title: string,
    body: string,
): Promise<void> {
    try {
        await Notifications.scheduleNotificationAsync({
            content: { title, body, data: { kind } },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date,
                channelId: ANDROID_CHANNEL_ID,
            },
        });
    } catch {
        // Tek bir bildirim kurulamadıysa diğerleri kurulmaya devam etsin
    }
}

/** Bugünün DAILY_HOUR'u; `offsetDays` kadar ileri kaydırılmış. */
function dailySlot(offsetDays: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(DAILY_HOUR, 0, 0, 0);
    return d;
}

async function scheduleDailyChallengeReminders(): Promise<void> {
    await cancelScheduled(['daily_challenge']);

    // Bugünün görevi bitmişse bugünün bildirimi hiç kurulmuyor. Yarın ve
    // sonrası için bilemeyiz; uygulama her açıldığında burası baştan işlediği
    // için o günler kendi sıraları geldiğinde doğru kararla yeniden kuruluyor.
    const doneToday = await isDailyCompleted();
    const now = Date.now();

    const title = i18n.t('notifications.daily_title');
    const body = i18n.t('notifications.daily_body');

    for (let offset = 0; offset < DAILY_HORIZON_DAYS; offset++) {
        const at = dailySlot(offset);
        // Geçmiş saat kurulamaz; bugünün saati geçtiyse ya da görev bittiyse atla.
        if (at.getTime() <= now) continue;
        if (offset === 0 && doneToday) continue;
        // 3. ve 7. günde hareketsizlik dürtmesi zaten gidiyor. Aynı güne ikinci
        // bir hatırlatıcı koymak, tam da uygulamayı açmayı bırakmış kişiye günde
        // iki bildirim atmak olurdu. O günler dürtmeye bırakılıyor: mesajı daha
        // isabetli, sayısı bir.
        if (INACTIVITY_DAYS.includes(offset)) continue;
        await schedule('daily_challenge', at, title, body);
    }
}

async function scheduleInactivityReminders(): Promise<void> {
    await cancelScheduled(['inactivity']);

    const now = Date.now();
    for (const days of INACTIVITY_DAYS) {
        const at = new Date(now + days * 24 * 60 * 60 * 1000);
        await schedule(
            'inactivity',
            at,
            i18n.t(`notifications.inactive_${days}_title`),
            i18n.t(`notifications.inactive_${days}_body`),
        );
    }
}

/** Kurulu her şeyi siler. Kullanıcı kapattığında ya da izin yokken çağrılır. */
export async function cancelAllReminders(): Promise<void> {
    await cancelScheduled(['daily_challenge', 'inactivity']);
}

/**
 * Hatırlatıcıların TEK doğru kaynağı. Her açılışta, dil değişiminde, ayar
 * değişiminde ve görev tamamlanınca çağrılır — hepsi planı baştan kurar.
 *
 * Hareketsizlik sayacı da buradan sıfırlanıyor: "son açılıştan 3/7 gün sonra"
 * kuralını uygulamanın öne gelmesiyle birlikte yeniden kurmak sağlıyor.
 */
export async function rescheduleReminders(): Promise<void> {
    const [enabled, granted] = await Promise.all([getPreferenceEnabled(), isPermissionGranted()]);
    if (!enabled || !granted) {
        await cancelAllReminders();
        return;
    }
    await scheduleDailyChallengeReminders();
    await scheduleInactivityReminders();
}

/** Teşhis için: kurulu hatırlatıcıların türe göre sayısı. */
export async function scheduledReminderCounts(): Promise<Record<ReminderKind, number>> {
    const counts: Record<ReminderKind, number> = { daily_challenge: 0, inactivity: 0 };
    try {
        for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
            const kind = reminderKindOf(n);
            if (kind) counts[kind]++;
        }
    } catch {
        // Sayım okunamadı — sıfırlar dönsün
    }
    return counts;
}
