const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

const borderRadius = {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
} as const;

const darkColors = {
    background: '#0F0F1E',
    backgroundGradient: ['#0F0F1E', '#1E1E3F'] as [string, string],
    surface: 'rgba(255, 255, 255, 0.08)',
    surfaceBorder: 'rgba(255, 255, 255, 0.12)',
    primary: '#6366F1',
    secondary: '#A855F7',
    accent: '#22D3EE',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    error: '#EF4444',
    success: '#10B981',
    proBadgeBg: 'rgba(34,211,238,0.15)',
    proBadgeText: '#22D3EE',
    statusBar: 'light' as 'light' | 'dark',
    // legacy aliases kept for compat
    glass: {
        bg: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.1)',
    },
    // card shadow (dark: soft)
    cardShadow: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
    },
    // modal sheet background
    modalSheet: '#1A1A2E',
};

const lightColors = {
    background: '#F3F1FF',
    backgroundGradient: ['#F3F1FF', '#E9E4FF'] as [string, string],
    surface: '#FFFFFF',
    surfaceBorder: 'rgba(99, 102, 241, 0.14)',
    primary: '#4F46E5',
    secondary: '#9333EA',
    accent: '#0891B2',
    text: '#12082E',
    textSecondary: '#5B5A72',
    error: '#DC2626',
    success: '#059669',
    proBadgeBg: '#EDE9FE',
    proBadgeText: '#4F46E5',
    statusBar: 'dark' as 'light' | 'dark',
    glass: {
        bg: 'rgba(99, 102, 241, 0.06)',
        border: 'rgba(99, 102, 241, 0.16)',
    },
    cardShadow: {
        shadowColor: '#6366F1',
        shadowOpacity: 0.10,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    modalSheet: '#FFFFFF',
};

export type AppColors = typeof darkColors;

export interface AppTheme {
    colors: AppColors;
    gradients: {
        background: string[];
        primary: string[];
        glass: string[];
    };
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
}

export const darkTheme: AppTheme = {
    colors: darkColors,
    gradients: {
        background: ['#0F0F1E', '#1E1E3F'],
        primary: ['#6366F1', '#A855F7'],
        glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)'],
    },
    spacing,
    borderRadius,
};

export const lightTheme: AppTheme = {
    colors: lightColors,
    gradients: {
        background: ['#F3F1FF', '#E9E4FF'],
        primary: ['#4F46E5', '#9333EA'],
        glass: ['rgba(99,102,241,0.09)', 'rgba(99,102,241,0.02)'],
    },
    spacing,
    borderRadius,
};

// Legacy static export — kept for files not yet migrated (will be overridden by context)
export const Theme = darkTheme;
