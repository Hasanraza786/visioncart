import {StyleSheet} from 'react-native';
import {COLORS, SIZES} from '../../constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SIZES.spacing.lg,
    backgroundColor: COLORS.backgroundMuted,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '700',
  },
  body: {
    marginTop: SIZES.spacing.sm,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
  status: {
    marginTop: SIZES.spacing.lg,
    borderRadius: SIZES.spacing.sm,
    backgroundColor: COLORS.white,
    padding: SIZES.spacing.md,
  },
  button: {
    minHeight: SIZES.buttonMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.spacing.md,
    borderRadius: SIZES.spacing.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.spacing.md,
  },
  buttonLabel: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  label: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  value: {
    marginBottom: SIZES.spacing.md,
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});
