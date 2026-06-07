import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    onPress?: () => void;
    gradient?: boolean;
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        pressable: {
            flex: 1,
            margin: theme.spacing.sm,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: theme.colors.statusBar === 'light' ? 1 : 0.5,
            borderColor: theme.colors.surfaceBorder,
            padding: theme.spacing.md,
            overflow: 'hidden',
            ...theme.colors.cardShadow,
        },
    });
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, onPress }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    const CardContent = (
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }, style]}>
            {children}
        </Animated.View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.pressable}
            >
                {CardContent}
            </Pressable>
        );
    }

    return CardContent;
};
