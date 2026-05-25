import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../storage/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password) return;
        if (password.length < 8) {
            Alert.alert('Error', t('register.error_password_length'));
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Success', 'Registration successful!');
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>{t('register.title')}</Text>
            <TextInput
                style={styles.input}
                placeholder={t('register.email')}
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder={t('register.password')}
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('register.submit')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
                <Text style={styles.linkText}>{t('register.login_prompt')}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: '#333' },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    button: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#007AFF', fontSize: 14 }
});
