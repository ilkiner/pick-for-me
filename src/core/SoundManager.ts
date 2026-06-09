import { Audio } from 'expo-av';

export type SoundName = 'wheel-spin' | 'wheel-stop' | 'dice-roll' | 'coin-flip' | 'winner' | 'tap';

const SOUND_FILES: Record<SoundName, any> = {
    'wheel-spin': require('../../assets/sounds/wheel-spin.mp3'),
    'wheel-stop': require('../../assets/sounds/wheel-stop.mp3'),
    'dice-roll':  require('../../assets/sounds/dice-roll.mp3'),
    'coin-flip':  require('../../assets/sounds/coin-flip.mp3'),
    'winner':     require('../../assets/sounds/winner.mp3'),
    'tap':        require('../../assets/sounds/tap.mp3'),
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
                playsInSilentModeIOS: false,
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
