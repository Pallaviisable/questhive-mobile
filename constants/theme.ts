/**
 * QuestHive brand palette — matched to the web app's dark, gamified look.
 */

import { Platform } from 'react-native';

const amber = '#f5c518';

const tintColorLight = amber;
const tintColorDark = amber;

export const Colors = {
  light: {
    text: '#11181C',
    textMuted: '#687076',
    background: '#fff',
    backgroundElevated: '#F7F7F7',
    backgroundElevated2: '#F0F0F0',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#F7F7F7',
    border: '#E3E3E3',
    success: '#16A34A',
    info: '#2563EB',
    danger: '#DC2626',
    purple: '#9333EA',
    muted: '#687076',
    coin: amber,
  },
  dark: {
    text: '#F5F5F5',
    textMuted: '#9BA1A6',
    background: '#0A0A0A',
    backgroundElevated: '#161616',
    backgroundElevated2: '#1E1E1E',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#161616',
    border: '#2A2A2A',
    success: '#22C55E',
    info: '#3B82F6',
    danger: '#F87171',
    purple: '#A855F7',
    muted: '#9BA1A6',
    coin: amber,
  },
};

// Shared spacing/radius scale so every screen stays visually consistent
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
