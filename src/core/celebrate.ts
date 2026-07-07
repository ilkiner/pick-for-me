import * as Haptics from 'expo-haptics';
import SoundManager from './SoundManager';

// Tek kazanan-anı geri bildirimi: her araçta AYNI his.
// winner sesi (ses ayarı kapalıysa SoundManager sessiz kalır) + success haptic.
// Kutlama animasyonu ekran tarafında kalır (spring reveal) — ses/haptik burada.
export function celebrateWinner(): void {
    SoundManager.play('winner');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
