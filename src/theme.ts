import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  danger: string;
  border: string;
  success: string;
  warn: string;
  muted: string;
  isDark: boolean;
}

// Attendance Tracker palette: ink-navy on cool grey with an amber highlight.
// Reads like a clipboard and a whistle, not a school form (Merit) or a
// homeschool ledger (Hearth). Night mode is deep navy with the amber up front.
export const lightTheme: Theme = {
  bg: '#F3F5F9',
  card: '#FFFFFF',
  cardAlt: '#E8ECF4',
  text: '#141B2E',
  textSecondary: '#4E5872',
  textFaint: '#8B94AB',
  accent: '#1F3A93',
  accentSoft: '#DCE3F7',
  highlight: '#E8A317',
  danger: '#C0392B',
  border: '#D9DEEA',
  success: '#1E8E5A',
  warn: '#D08A0B',
  muted: '#6B7590',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#0F1424',
  card: '#181F35',
  cardAlt: '#222B47',
  text: '#ECEFF7',
  textSecondary: '#B3BBD1',
  textFaint: '#77809B',
  accent: '#F2B544',
  accentSoft: '#33301F',
  highlight: '#F2B544',
  danger: '#F06A5E',
  border: '#2A3350',
  success: '#4FCB8A',
  warn: '#F2B544',
  muted: '#8E97B0',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
