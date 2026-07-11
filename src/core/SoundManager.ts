import { Audio } from 'expo-av';

export type SoundName = 'wheel-spin' | 'wheel-stop' | 'dice-roll' | 'coin-flip' | 'winner' | 'tap';

const SOUND_FILES: Record<SoundName, any> = {
    'wheel-spin': require('../../assets/sounds/mixkit-bike-wheel-spinning-1613.wav'),
    // wheel-stop.mp3 0 baytlık placeholder'dı; duruşta kısa "tık" için tap sesi kullanılıyor.
    // Özel bir duruş sesi eklenirse burayı ona yönlendir.
    'wheel-stop': require('../../assets/sounds/mixkit-arcade-game-jump-coin-216.wav'),
    'dice-roll':  require('../../assets/sounds/mixkit-drum-roll-566.wav'),
    'coin-flip':  require('../../assets/sounds/677853__el_boss__coin-flip-ping.mp3'),
    'winner':     require('../../assets/sounds/mixkit-ethereal-fairy-win-sound-2019.wav'),
    'tap':        require('../../assets/sounds/mixkit-arcade-game-jump-coin-216.wav'),
};

class SoundManager {
    private sounds: Partial<Record<SoundName, Audio.Sound>> = {};
    private _enabled = true;
    private _loopingSound: Audio.Sound | null = null;
    private _initialized = false;

    async init(): Promise<void> {
        if (this._initialized) return;
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });
            this._initialized = true;
        } catch (e) {
            this._initialized = true; // don't retry on failure
        }
    }

    async preload(): Promise<void> {
        for (const [name, file] of Object.entries(SOUND_FILES) as [SoundName, any][]) {
            try {
                const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
                this.sounds[name] = sound;
            } catch {
                // Placeholder or missing file — silent fallback
            }
        }
    }

    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        if (!enabled) {
            this._stopLoop();
        }
    }

    async getDuration(name: SoundName): Promise<number> {
        const sound = this.sounds[name];
        if (!sound) return 0;
        try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) return status.durationMillis ?? 0;
        } catch {}
        return 0;
    }

    // Plays a sound and fires callbacks based on real playback position.
    // onNearEnd fires when msBeforeEnd ms remain; onEnd fires when sound finishes.
    async playTracked(
        name: SoundName,
        onNearEnd: () => void,
        onEnd: () => void,
        msBeforeEnd = 800
    ): Promise<void> {
        if (!this._enabled) { onNearEnd(); onEnd(); return; }
        const sound = this.sounds[name];
        if (!sound) { onNearEnd(); onEnd(); return; }

        let nearFired = false;

        sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (!nearFired && status.durationMillis) {
                const remaining = status.durationMillis - (status.positionMillis ?? 0);
                if (remaining <= msBeforeEnd) {
                    nearFired = true;
                    onNearEnd();
                }
            }
            if (status.didJustFinish) {
                sound.setOnPlaybackStatusUpdate(null);
                if (!nearFired) { nearFired = true; onNearEnd(); }
                onEnd();
            }
        });

        try {
            await sound.setStatusAsync({ progressUpdateIntervalMillis: 100 });
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch {
            onNearEnd();
            onEnd();
        }
    }

    async playAndWait(name: SoundName): Promise<void> {
        if (!this._enabled) return;
        const sound = this.sounds[name];
        if (!sound) return;
        return new Promise((resolve) => {
            const cleanup = () => {
                try { sound.setOnPlaybackStatusUpdate(null); } catch {}
                resolve();
            };
            sound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded || status.didJustFinish) cleanup();
            });
            sound.setPositionAsync(0)
                .then(() => sound.playAsync())
                .catch(() => cleanup());
        });
    }

    async play(name: SoundName): Promise<void> {
        if (!this._enabled) return;
        const sound = this.sounds[name];
        if (!sound) return;
        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch {
            // ignore decode / playback errors
        }
    }

    // Tek seferlik bir sesi erken durdurur (ör. animasyon sesten önce bittiğinde).
    async stop(name: SoundName): Promise<void> {
        const sound = this.sounds[name];
        if (!sound) return;
        try {
            await sound.stopAsync();
        } catch {
            // ignore
        }
    }

    async playLoop(name: SoundName): Promise<void> {
        if (!this._enabled) return;
        const sound = this.sounds[name];
        if (!sound) return;
        try {
            await sound.setIsLoopingAsync(true);
            await sound.setPositionAsync(0);
            await sound.playAsync();
            this._loopingSound = sound;
        } catch {
            // ignore
        }
    }

    async stopLoop(): Promise<void> {
        await this._stopLoop();
    }

    private async _stopLoop(): Promise<void> {
        if (!this._loopingSound) return;
        const s = this._loopingSound;
        this._loopingSound = null;
        try {
            await s.stopAsync();
            await s.setIsLoopingAsync(false);
        } catch {
            // ignore
        }
    }
}

export default new SoundManager();
