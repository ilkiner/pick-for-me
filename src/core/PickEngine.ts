interface WheelOption {
    id: string;
    label: string;
    color?: string;
}

export interface BracketMatch {
    id: string;
    a: string;
    b: string | null; // null = bye
    winner?: string;
}

export class PickEngine {
    // Wheel of Fortune
    static spinWheel(options: WheelOption[]): WheelOption | null {
        if (!options || options.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    }

    // Dice (1 or 2 dice, supporting 4, 6, 8, 10, 12, 20 sides)
    static rollDice(count: number = 1, sides: number = 6): number[] {
        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * sides) + 1);
        }
        return results;
    }

    // Coin flip
    static flipCoin(forceEdge: boolean = false): 'heads' | 'tails' | 'edge' {
        if (forceEdge) return 'edge';
        return Math.random() < 0.5 ? 'heads' : 'tails';
    }

    // Random color from pool
    static pickColor(pool?: string[]): { hex: string, name: string } {
        const colorNames: { [key: string]: string } = {
            '#FF5733': 'Persimmon',
            '#33FF57': 'Screamin Green',
            '#3357FF': 'Royal Blue',
            '#F333FF': 'Phlox',
            '#33FFF5': 'Turquoise',
            '#FFF533': 'Goldenrod',
            '#FF3B30': 'System Red',
            '#AF52DE': 'System Purple',
            '#FF9500': 'System Orange',
            '#34C759': 'System Green',
            '#5AC8FA': 'System Blue',
            '#FFCC00': 'System Yellow',
        };
        const defaultPool = Object.keys(colorNames);
        const activePool = pool && pool.length > 0 ? pool : defaultPool;
        const randomIndex = Math.floor(Math.random() * activePool.length);
        const hex = activePool[randomIndex];
        return { hex, name: colorNames[hex] || 'Custom Color' };
    }

    // Random word
    static pickWord(words: string[]): string | null {
        if (!words || words.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * words.length);
        return words[randomIndex];
    }

    // Random movie
    static pickMovie(movies: string[]): string | null {
        if (!movies || movies.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * movies.length);
        return movies[randomIndex];
    }
    // Advanced color generation for 2026 trends
    static generateAdvancedColor(mode: string = 'random') {
        let h = Math.floor(Math.random() * 360);
        let s = 50;
        let l = 50;

        switch (mode) {
            case 'organic':
                // Earthy, natural: Hues (20-150), Low saturation (20-40), Muted lightness (30-60)
                h = Math.random() < 0.5 ? Math.floor(Math.random() * 40) + 20 : Math.floor(Math.random() * 70) + 80;
                s = Math.floor(Math.random() * 20) + 20;
                l = Math.floor(Math.random() * 30) + 30;
                break;
            case 'vivid':
                // Bold, high energy: High saturation (80-100), Mid lightness (45-60)
                s = Math.floor(Math.random() * 20) + 80;
                l = Math.floor(Math.random() * 15) + 45;
                break;
            case 'digital':
                // Futuristic, cool: Hues (180-300), High saturation (70-90), High contrast
                h = Math.floor(Math.random() * 120) + 180;
                s = Math.floor(Math.random() * 20) + 70;
                l = Math.floor(Math.random() * 20) + 50;
                break;
            case 'soft':
                // Elegant, luxury: High lightness (80-90), Low saturation (10-30)
                s = Math.floor(Math.random() * 20) + 10;
                l = Math.floor(Math.random() * 10) + 80;
                break;
            default:
                s = Math.floor(Math.random() * 60) + 30;
                l = Math.floor(Math.random() * 40) + 30;
                break;
        }

        const primary = this.hslToHex(h, s, l);
        const lighter = this.hslToHex(h, s, Math.min(l + 20, 95));
        const darker = this.hslToHex(h, s, Math.max(l - 20, 10));
        const accent = this.hslToHex((h + 180) % 360, s, l);

        return {
            hex: primary,
            h, s, l,
            palette: { primary, lighter, darker, accent },
            metadata: this.getColorMetadata(h, s, l)
        };
    }

    private static hslToHex(h: number, s: number, l: number): string {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    }

    // Tournament bracket
    static buildBracket(items: string[]): BracketMatch[] {
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        const matches: BracketMatch[] = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            matches.push({
                id: `m-${i}`,
                a: shuffled[i],
                b: i + 1 < shuffled.length ? shuffled[i + 1] : null,
            });
        }
        return matches;
    }

    static nextBracketRound(winners: string[]): { matches: BracketMatch[], champion: string | null } {
        if (winners.length === 1) return { matches: [], champion: winners[0] };
        const matches: BracketMatch[] = [];
        for (let i = 0; i < winners.length; i += 2) {
            matches.push({
                id: `m-${i}`,
                a: winners[i],
                b: i + 1 < winners.length ? winners[i + 1] : null,
            });
        }
        return { matches, champion: null };
    }

    // Order & Teams
    static shuffleOrder(items: string[]): string[] {
        return [...items].sort(() => Math.random() - 0.5);
    }

    static splitTeams(items: string[], n: number): string[][] {
        const shuffled = this.shuffleOrder(items);
        const teams: string[][] = Array.from({ length: n }, () => []);
        shuffled.forEach((item, i) => teams[i % n].push(item));
        return teams;
    }

    private static getColorMetadata(h: number, s: number, l: number) {
        // Simple name mapping
        let nameKey = 'grey';
        if (s < 10) nameKey = 'grey';
        else if (h < 20 || h > 340) nameKey = 'red';
        else if (h < 50) nameKey = 'orange';
        else if (h < 70) nameKey = 'yellow';
        else if (h < 150) nameKey = 'green';
        else if (h < 200) nameKey = 'cyan';
        else if (h < 260) nameKey = 'blue';
        else if (h < 300) nameKey = 'purple';
        else nameKey = 'pink';

        // Description based on S and L
        let descKey = 'vivid';
        if (l > 75) descKey = 'light';
        else if (l < 30) descKey = 'deep';
        else if (s < 40) descKey = 'muted';

        // Suggestion based on lifestyle/fashion (S and L)
        let sugKey = 'main';
        if (s > 60 && l > 40 && l < 70) sugKey = 'lifestyle';
        else if (s < 30 && l > 60) sugKey = 'home';
        else if (s < 50 && l < 40) sugKey = 'detail';
        else sugKey = 'main';

        return { nameKey, descKey, sugKey };
    }
}

