import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    headerCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    headerTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listContent: {
      gap: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    emptyState: {
      padding: Spacing['3xl'],
      alignItems: 'center',
      borderRadius: BorderRadius.md,
    },
    summaryCard: {
      flexDirection: 'row',
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
      gap: Spacing.lg,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    summaryLabel: {
      marginTop: Spacing.xs,
    },
    sectionTitle: {
      marginTop: Spacing.sm,
    },
    workerCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
    },
    workerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
  });
};
