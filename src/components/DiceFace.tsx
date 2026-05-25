import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface DiceFaceProps {
    value: number;
    size?: number;
}

const DiceFace: React.FC<DiceFaceProps> = ({ value, size = 100 }) => {
    const dotSize = size * 0.18;

    const renderDots = () => {
        const dots = [];
        const dotPositions = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8],
        };

        const activeDots = dotPositions[value as keyof typeof dotPositions] || [];

        for (let i = 0; i < 9; i++) {
            dots.push(
                <View key={i} style={[styles.dotContainer, { width: '33.33%', height: '33.33%' }]}>
                    {activeDots.includes(i) && (
                        <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
                    )}
                </View>
            );
        }
        return dots;
    };

    return (
        <View style={[styles.diceContainer, { width: size + 4, height: size + 8 }]}>
            {/* Shadow/Side layer for 3D effect */}
            <View style={[styles.side, { width: size, height: size, borderRadius: size * 0.15, top: 6 }]} />
            {/* Front Face */}
            <View style={[styles.face, { width: size, height: size, borderRadius: size * 0.15 }]}>
                <View style={styles.grid}>
                    {renderDots()}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    diceContainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    side: {
        position: 'absolute',
        backgroundColor: '#D1D5DB', // Gray-300 for the "depth"
    },
    face: {
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    grid: {
        width: '80%',
        height: '80%',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dotContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        backgroundColor: '#1F2937', // Gray-800
        // Soft inner shadow effect could be added here if needed, 
        // but simple circle is cleaner for small sizes.
    },
});

export default DiceFace;
