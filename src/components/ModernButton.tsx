import React from 'react';
import { Text, StyleSheet, Pressable, Animated, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '../core/Theme';

interface ModernButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline';
    disabled?: boolean;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    variant = 'primary',
    disabled = false
}) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const getVariantStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondary;
            case 'outline':
                return styles.outline;
            default:
                return styles.primary;
        }
    };

    const getVariantTextStyle = () => {
        switch (variant) {
            case 'outline':
                return styles.outlineText;
            default:
                return styles.text;
        }
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                getVariantStyle(),
                style,
                disabled && styles.disabled,
            ]}
        >
            <Animated.Text style={[
                getVariantTextStyle(),
                textStyle,
                { transform: [{ scale: scaleAnim }] }
            ]}>
                {title}
            </Animated.Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: Theme.spacing.sm,
    },
    primary: {
        backgroundColor: Theme.colors.primary,
    },
    secondary: {
        backgroundColor: Theme.colors.secondary,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Theme.colors.primary,
    },
    text: {
        color: Theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    outlineText: {
        color: Theme.colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.5,
    },
});
