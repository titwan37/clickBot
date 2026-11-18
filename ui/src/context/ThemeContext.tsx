import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define Theme Types
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgHover: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    border: string;
    borderLight: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    shadow: string;
    shadowLg: string;
}

export interface Theme {
    mode: ThemeMode;
    colors: ThemeColors;
}

// Color Palettes
const darkColors: ThemeColors = {
    bgPrimary: '#0f172a',    // Slate 900
    bgSecondary: '#1e293b',  // Slate 800
    bgTertiary: '#334155',   // Slate 700
    bgHover: '#475569',      // Slate 600
    textPrimary: '#f8fafc',  // Slate 50
    textSecondary: '#cbd5e1',// Slate 300
    textMuted: '#64748b',    // Slate 500
    accent: '#38bdf8',       // Sky 400
    accentHover: '#0ea5e9',  // Sky 500
    border: '#334155',       // Slate 700
    borderLight: '#475569',  // Slate 600
    success: '#10b981',      // Emerald 500
    error: '#ef4444',        // Red 500
    warning: '#eab308',      // Yellow 500
    info: '#3b82f6',         // Blue 500
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
};

const lightColors: ThemeColors = {
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',  // Slate 50
    bgTertiary: '#e2e8f0',   // Slate 200
    bgHover: '#cbd5e1',      // Slate 300
    textPrimary: '#0f172a',  // Slate 900
    textSecondary: '#475569',// Slate 600
    textMuted: '#94a3b8',    // Slate 400
    accent: '#0284c7',       // Sky 600
    accentHover: '#0369a1',  // Sky 700
    border: '#e2e8f0',       // Slate 200
    borderLight: '#cbd5e1',  // Slate 300
    success: '#059669',      // Emerald 600
    error: '#dc2626',        // Red 600
    warning: '#ca8a04',      // Yellow 600
    info: '#2563eb',         // Blue 600
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('clickbot-theme');
        return (saved as ThemeMode) || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('clickbot-theme', mode);
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const toggleTheme = () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));

    const theme: Theme = {
        mode,
        colors: mode === 'dark' ? darkColors : lightColors,
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};