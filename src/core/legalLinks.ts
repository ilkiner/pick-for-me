// Yasal metinler ve abonelik yönetimi — Ayarlar ile paywall aynı adresleri kullanır.

export const PRIVACY_URL = 'https://ilkiner.github.io/pick-for-me/privacy-policy.html';
export const TERMS_URL = 'https://ilkiner.github.io/pick-for-me/terms.html';

const ANDROID_PACKAGE = 'com.pickforme.app';

/**
 * Google Play abonelik yönetimi sayfası. productId verilirse doğrudan o
 * aboneliğin sayfası açılır. RevenueCat, Play ürün kimliğini "abonelikId:basePlanId"
 * biçiminde veriyor; Play'in `sku` parametresi yalnızca abonelik kimliğini bekliyor.
 */
export function manageSubscriptionUrl(productId?: string | null): string {
    const sku = productId ? productId.split(':')[0] : '';
    return sku
        ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(sku)}&package=${ANDROID_PACKAGE}`
        : `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`;
}
