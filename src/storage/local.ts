import AsyncStorage from '@react-native-async-storage/async-storage';

export const LocalStorage = {
    async setItem(key: string, value: any) {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (e) {
            console.error('Error setting item', e);
        }
    },
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('Error getting item', e);
            return null;
        }
    }
};
