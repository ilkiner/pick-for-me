import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { Theme } from '../core/Theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    gradient?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, onPress, gradient }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const CardContent = (
        <Animated.View style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
            style
        ]}>
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

const styles = StyleSheet.create({
    pressable: {
        flex: 1,
        margin: Theme.spacing.sm,
    },
    card: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.surfaceBorder,
        padding: Theme.spacing.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
});
