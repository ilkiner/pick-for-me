import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../i18n';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error.message, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.emoji}>⚠️</Text>
                        <Text style={styles.title}>{i18n.t('common.error_title', 'Bir şeyler ters gitti')}</Text>
                        <Text style={styles.body}>{i18n.t('common.error_body', 'Beklenmedik bir hata oluştu. Endişelenme, verilerine bir şey olmadı.')}</Text>
                        <TouchableOpacity
                            style={styles.btn}
                            onPress={() => this.setState({ hasError: false })}
                            accessibilityRole="button"
                        >
                            <Text style={styles.btnText}>{i18n.t('common.error_retry', 'Tekrar Dene')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F1E' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emoji: { fontSize: 56, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
    body: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    btn: {
        backgroundColor: '#6366F1',
        paddingVertical: 15, paddingHorizontal: 40,
        borderRadius: 16,
        shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
