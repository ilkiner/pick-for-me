// Şifre politikası — TEK kaynak.
//
// Kayıt ekranı 8 karakter isterken şifre sıfırlama 6'ya izin veriyordu; yani
// sıfırlama akışı kayıt politikasından zayıf şifre kabul ediyordu. Kural artık
// tek yerde: hem kayıt hem sıfırlama bunu kullanıyor.
//
// Sunucu tarafı (Supabase > Authentication > Password) da min 8 + harf/rakam
// olarak ayarlı. İstemci doğrulaması onun yerine geçmez — kullanıcıya ağ turu
// beklemeden anlamlı bir hata göstermek için var. Otorite her zaman sunucu.

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = 'too_short' | 'needs_letter_and_digit';

/** Politikaya uymayan ilk kuralı döndürür; şifre geçerliyse null. */
export function validatePassword(password: string): PasswordProblem | null {
    if (password.length < MIN_PASSWORD_LENGTH) return 'too_short';
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (!hasLetter || !hasDigit) return 'needs_letter_and_digit';
    return null;
}

/** Sorunun i18n anahtarı. Çağıran taraf `t(key, { count: MIN_PASSWORD_LENGTH })`. */
export function passwordProblemKey(problem: PasswordProblem): string {
    return problem === 'too_short'
        ? 'auth.password_too_short'
        : 'auth.password_needs_letter_and_digit';
}
