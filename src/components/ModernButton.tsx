import React, { useMemo } from 'react';
import { Text, StyleSheet, Pressable, Animated, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { AppTheme } from '../core/Theme';

interface ModernButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline';
    disabled?: boolean;
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        button: {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: theme.spacing.sm,
        },
        primary: { backgroundColor: theme.colors.primary },
        secondary: { backgroundColor: theme.colors.secondary },
        outline: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.primary,
        },
        text: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 0.5,
        },
        outlineText: {
            color: theme.colors.primary,
            fontSize: 16,
            fontWeight: '700',
        },
        disabled: { opacity: 0.5 },
    });
}

export const ModernButton: React.FC<ModernButtonProps> = ({
    title, onPress, style, textStyle,
    variant = 'primary', disabled = false,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    const handlePressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    const variantStyle = variant === 'secondary' ? styles.secondary
        : variant === 'outline' ? styles.outline : styles.primary;
    const variantText = variant === 'outline' ? styles.outlineText : styles.text;

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[styles.button, variantStyle, style, disabled && styles.disabled]}
        >
            <Animated.Text style={[variantText, textStyle, { transform: [{ scale: scaleAnim }] }]}>
                {title}
            </Animated.Text>
        </Pressable>
    );
};
