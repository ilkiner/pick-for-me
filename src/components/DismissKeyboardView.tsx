import React from 'react';
import {
    Keyboard,
    StyleProp,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';

/**
 * Boş bir yere dokunulunca klavyeyi kapatan sarmalayıcı.
 *
 * React Native'de klavye kendiliğinden kapanmıyor: kullanıcı yazmayı bitirip
 * ekranın boşluğuna dokunduğunda klavye ekranın yarısını kaplamaya devam
 * ediyor ve altındaki düğmeler erişilemez kalıyor.
 *
 * Kaydırılabilir alanlar için bu YETMEZ: ScrollView/FlatList dokunuşu kendi
 * yutuyor, üstteki TouchableWithoutFeedback'e hiç ulaşmıyor. Onlarda çözüm
 * liste bileşeninin kendi üzerindeki iki özellik:
 *
 *     keyboardShouldPersistTaps="handled"   bir çocuk dokunuşu karşılamazsa
 *                                           klavyeyi kapat (düğmeler yine çalışır)
 *     keyboardDismissMode="on-drag"         parmakla kaydırınca kapat
 *
 * Bu yüzden ikisi birlikte kullanılıyor: sarmalayıcı sabit alanları
 * (başlık, ayarlar satırı, boşluklar), liste özellikleri de kaydırılan alanı
 * karşılıyor.
 *
 * `accessible={false}`: ekran okuyucu tüm ekranı tek bir düğme gibi okumasın.
 */
export function DismissKeyboardView({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={[{ flex: 1 }, style]}>{children}</View>
        </TouchableWithoutFeedback>
    );
}
