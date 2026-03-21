import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    addButton: {
      width: 40,
      height: 40,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      gap: Spacing.md,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      gap: Spacing.md,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyText: {
      marginTop: Spacing.md,
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
      flex: 1,
      gap: Spacing.md,
    },
    workerIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${theme.primary}15`,
    },
    workerName: {
      flex: 1,
    },
    workerActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputContainer: {
      gap: Spacing.xs,
    },
    inputLabel: {
      marginBottom: Spacing.xs,
    },
    input: {
      minHeight: 48,
      padding: Spacing.md,
      backgroundColor: theme.backgroundRoot,
      borderRadius: BorderRadius.md,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    modalContent: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      maxHeight: '80%',
    },
    deleteModal: {
      maxWidth: 360,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalBody: {
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    label: {
      marginBottom: Spacing.xs,
    },
    textInput: {
      minHeight: 48,
      padding: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: Spacing.lg,
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    submitButton: {
      backgroundColor: theme.primary,
    },
  });
};
