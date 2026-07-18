import {StyleSheet} from 'react-native';
import {COLORS, SIZES} from '../../constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.title,
    fontWeight: '700',
  },
  body: {
    marginTop: SIZES.spacing.sm,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
  spinner: {
    marginTop: SIZES.spacing.xl,
  },
  button: {
    marginTop: SIZES.spacing.lg,
    minHeight: SIZES.buttonMinHeight,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.spacing.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.spacing.md,
  },
  buttonLabel: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});
