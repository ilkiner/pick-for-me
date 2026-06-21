export type ContentCategory = 'food' | 'activity' | 'place' | 'gift';
export type CategoryWeights = Record<ContentCategory, number>;

export function getContextualWeights(): CategoryWeights {
    const hour = new Date().getHours();
    const dow = new Date().getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dow === 0 || dow === 6;

    const w: CategoryWeights = { food: 1, activity: 1, place: 1, gift: 1 };

    if (hour >= 6 && hour < 11) {
        // Morning: lean toward activity and going places
        w.activity += 1.5;
        w.place += 0.5;
    } else if (hour >= 11 && hour < 15) {
        // Midday / lunch: heavy food and going out
        w.food += 2.5;
        w.place += 1;
    } else if (hour >= 17 && hour < 22) {
        // Evening: dinner and night out
        w.food += 2;
        w.place += 1.5;
        w.activity += 0.5;
    } else {
        // Late night: cozy activity or gift ideas (browsing)
        w.activity += 1;
        w.gift += 0.5;
    }

    if (isWeekend) {
        // Weekends: more outings and activities
        w.place += 1.5;
        w.activity += 1;
    }

    return w;
}

export function weightedRandomCategory(weights: CategoryWeights): ContentCategory {
    const keys = Object.keys(weights) as ContentCategory[];
    const total = keys.reduce((sum, k) => sum + weights[k], 0);
    let r = Math.random() * total;
    for (const k of keys) {
        r -= weights[k];
        if (r <= 0) return k;
    }
    return keys[0];
}
