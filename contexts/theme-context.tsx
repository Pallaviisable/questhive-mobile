import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Scheme = 'light' | 'dark';
const THEME_KEY = 'qh_theme';

type ThemeContextType = {
  scheme: Scheme;
  toggleScheme: () => void;
  setScheme: (s: Scheme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  scheme: 'dark',
  toggleScheme: () => {},
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>('dark');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') setSchemeState(saved);
      } catch {}
    })();
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(THEME_KEY, s).catch(() => {});
  };

  const toggleScheme = () => setScheme(scheme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ scheme, toggleScheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
