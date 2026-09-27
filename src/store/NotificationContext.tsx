import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { track } from '../core/Analytics';
import {
    cancelAllReminders,
    configureNotifications,
    getPreferenceEnabled,
    hasAskedPermission,
    isPermissionGranted,
    markPermissionAsked,
    requestPermission,
    rescheduleReminders,
    setPreferenceEnabled,
} from '../core/notifications';

interface NotificationContextValue {
    /** Hatırlatıcılar gerçekten çalışıyor mu: uygulama tercihi VE işletim sistemi izni. */
    enabled: boolean;
    /** Ayarlar'daki anahtar. İzin yoksa açmaya çalışmak izni de ister. */
    setEnabled: (enabled: boolean) => void;
    /**
     * İlk görev tamamlandıktan sonra izin ister. En fazla BİR kez sorar:
     * reddeden kullanıcıya bir daha bu kutu gösterilmez (Ayarlar'dan hâlâ
     * açabilir).
     */
    askAfterFirstChallenge: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
    enabled: false,
    setEnabled: () => {},
    askAfterFirstChallenge: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const [prefEnabled, setPrefEnabled] = useState(false);
    const [granted, setGranted] = useState(false);

    // Alert açıkken uygulama arka plana gidip geri geliyor (sistem izin kutusu
    // da öyle). AppState dinleyicisinin bu sırada ikinci bir kutu açmaması için.
    const askingRef = useRef(false);

    const syncPermission = useCallback(async () => {
        const value = await isPermissionGranted();
        setGranted(value);
        return value;
    }, []);

    // Açılış: kanalı kur, tercih ve izni oku, planı baştan yaz.
    useEffect(() => {
        let alive = true;
        (async () => {
            await configureNotifications();
            const [pref] = await Promise.all([getPreferenceEnabled(), syncPermission()]);
            if (!alive) return;
            setPrefEnabled(pref);
            await rescheduleReminders();
        })();
        return () => { alive = false; };
    }, [syncPermission]);

    // Uygulama her öne geldiğinde yeniden planla. İki iş birden yapıyor:
    // hareketsizlik sayacını sıfırlıyor ("son açılıştan 3/7 gün sonra") ve
    // kullanıcı sistem ayarlarından izni değiştirdiyse onu yakalıyor.
    useEffect(() => {
        const onChange = async (state: AppStateStatus) => {
            if (state !== 'active' || askingRef.current) return;
            await syncPermission();
            await rescheduleReminders();
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [syncPermission]);

    // Bildirim metinleri planlama anında yazılıyor; dil değişince kurulu olanlar
    // eski dilde kalır. Yeniden planlamak tek çözüm.
    useEffect(() => {
        const onLanguageChanged = () => {
            configureNotifications().then(() => rescheduleReminders()).catch(() => {});
        };
        i18n.on('languageChanged', onLanguageChanged);
        return () => { i18n.off('languageChanged', onLanguageChanged); };
    }, []);

    /** İzin kalıcı olarak reddedilmişse tek çıkış sistem ayarları. */
    const showBlockedAlert = useCallback(() => {
        Alert.alert(
            t('notifications.blocked_title'),
            t('notifications.blocked_msg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('notifications.open_settings'),
                    onPress: () => { Linking.openSettings().catch(() => {}); },
                },
            ],
        );
    }, [t]);

    const setEnabled = useCallback((next: boolean) => {
        (async () => {
            if (!next) {
                setPrefEnabled(false);
                await setPreferenceEnabled(false);
                await cancelAllReminders();
                track('notifications_disabled');
                return;
            }

            // Açmak isteniyor: önce işletim sistemi izni olmalı.
            let ok = granted;
            if (!ok) {
                askingRef.current = true;
                try {
                    const status = await Notifications.getPermissionsAsync().catch(() => null);
                    // Android 13+ bir kez reddedildikten sonra istek kutusunu bir
                    // daha göstermiyor; sessizce "reddedildi" dönüyor. Kullanıcıyı
                    // hiçbir şey olmayan bir düğmeyle baş başa bırakmayalım.
                    if (status && !status.granted && !status.canAskAgain) {
                        showBlockedAlert();
                        return;
                    }
                    ok = await requestPermission();
                    await markPermissionAsked();
                } finally {
                    askingRef.current = false;
                }
                setGranted(ok);
                if (!ok) {
                    showBlockedAlert();
                    return;
                }
            }

            setPrefEnabled(true);
            await setPreferenceEnabled(true);
            // Buradan açan kullanıcıya ilk görevden sonra aynı şeyi bir daha
            // sormanın anlamı yok.
            await markPermissionAsked();
            await rescheduleReminders();
            track('notifications_enabled');
        })();
    }, [granted, showBlockedAlert]);

    const askAfterFirstChallenge = useCallback(() => {
        (async () => {
            // Ayarlar'dan zaten açılmışsa orada işaretlenmiş olur; bir daha sorma.
            if (await hasAskedPermission()) return;

            // Soru her Android sürümünde soruluyor. Android 12 ve öncesinde
            // sistem izin kutusu hiç çıkmaz (izin verili sayılır), dolayısıyla
            // kullanıcının onayını alabileceğimiz TEK yer burası — atlarsak
            // hatırlatıcılar hiç sorulmadan başlar.
            askingRef.current = true;
            track('notifications_prompt_shown');
            Alert.alert(
                t('notifications.permission_title'),
                t('notifications.permission_msg'),
                [
                    {
                        text: t('notifications.permission_later'),
                        style: 'cancel',
                        onPress: () => {
                            askingRef.current = false;
                            // Israr etmiyoruz: bir daha bu kutu açılmayacak.
                            // Tercihi de açıkça kapatıyoruz, yoksa izin kutusu
                            // olmayan Android sürümlerinde "Şimdi değil" demek
                            // hiçbir şeyi değiştirmezdi.
                            markPermissionAsked().catch(() => {});
                            setPreferenceEnabled(false).catch(() => {});
                            cancelAllReminders().catch(() => {});
                            track('notifications_prompt_declined');
                        },
                    },
                    {
                        text: t('notifications.permission_enable'),
                        onPress: () => {
                            (async () => {
                                try {
                                    const ok = await requestPermission();
                                    await markPermissionAsked();
                                    setGranted(ok);
                                    if (ok) {
                                        setPrefEnabled(true);
                                        await setPreferenceEnabled(true);
                                        await rescheduleReminders();
                                    }
                                    track(ok ? 'notifications_prompt_granted' : 'notifications_prompt_denied');
                                } finally {
                                    askingRef.current = false;
                                }
                            })();
                        },
                    },
                ],
                { cancelable: false },
            );
        })();
    }, [t]);

    return (
        <NotificationContext.Provider
            value={{ enabled: prefEnabled && granted, setEnabled, askAfterFirstChallenge }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotificationContextValue {
    return useContext(NotificationContext);
}
