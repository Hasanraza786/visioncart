import {spacing} from '@visioncart/design-system';

export const COLORS = {
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primaryMuted: '#EFF4FF',
  background: '#FFFFFF',
  backgroundMuted: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#4B5563',
  textSubtle: '#6B7280',
  success: '#059669',
  successMuted: '#ECFDF5',
  danger: '#DC2626',
  accent: '#F59E0B',
  white: '#FFFFFF',
} as const;

export const SIZES = {
  spacing,
  title: 32,
  heading: 28,
  subheading: 20,
  body: 16,
  label: 14,
  caption: 12,
  buttonMinHeight: 48,
  radius: 12,
  radiusLg: 16,
} as const;
