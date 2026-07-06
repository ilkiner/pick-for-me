// MatchEngine — "Birlikte Seç" (eşleştirme) modunun saf mantığı.
//
// Akış: iki oyuncu AYNI desteyi sırayla kaydırır (sağ = beğen, sol = geç).
// Her iki oyuncunun da beğendiği ilk ortak öğe "eşleşme" sayılır.
//
// Bu dosya bilinçli olarak UI'sız tutuldu: buildDeck + findMatch saf
// fonksiyonlardır, böylece film / yemek / herhangi bir liste ile
// yeniden kullanılabilir ve kolayca test edilebilir.

export interface MatchItem {
    id: string;
    label: string;
}

export class MatchEngine {
    /**
     * Verilen etiket listesinden karıştırılmış, TEKRARSIZ bir deste üretir.
     *
     * Mantık:
     * 1. Aynı etiket birden fazla geçiyorsa teke indir (Set ile dedupe).
     * 2. Fisher–Yates ile karıştır (her permütasyon eşit olasılıklı;
     *    sort(() => Math.random() - 0.5) gibi yanlı değildir).
     * 3. İlk `size` öğeyi al (liste daha kısaysa hepsi kullanılır).
     * 4. Her karta deste içi sırasından bağımsız, etiketine bağlı olmayan
     *    benzersiz bir id ver — böylece aynı etiketli farklı desteler
     *    karışmaz ve id'ler UI key'i olarak güvenle kullanılabilir.
     */
    static buildDeck(items: string[], size: number = 14): MatchItem[] {
        const unique = Array.from(new Set(items.map(s => s.trim()).filter(Boolean)));

        // Fisher–Yates shuffle
        for (let i = unique.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unique[i], unique[j]] = [unique[j], unique[i]];
        }

        return unique.slice(0, size).map((label, index) => ({
            id: `card-${index}`,
            label,
        }));
    }

    /**
     * İki tarafın da beğendiği İLK ortak öğenin id'sini döndürür.
     *
     * Mantık:
     * - likesA ve likesB Set'e çevrilir (O(1) üyelik kontrolü).
     * - deckIds DESTE SIRASINA göre gezilir; iki sette de bulunan ilk id
     *   döner. Böylece sonuç deterministiktir: aynı deste + aynı beğeniler
     *   her zaman aynı eşleşmeyi verir.
     * - Ortak beğeni yoksa null döner ("eşleşme çıkmadı" durumu).
     */
    static findMatch(deckIds: string[], likesA: string[], likesB: string[]): string | null {
        const setA = new Set(likesA);
        const setB = new Set(likesB);
        for (const id of deckIds) {
            if (setA.has(id) && setB.has(id)) return id;
        }
        return null;
    }
}
