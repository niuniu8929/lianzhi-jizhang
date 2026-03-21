import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    formCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      gap: Spacing.lg,
    },
    selector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    workerSelectorContainer: {
      gap: Spacing.sm,
    },
    label: {
      marginBottom: Spacing.xs,
    },
    workersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    workerChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    workerChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    workerChipZero: {
      backgroundColor: theme.backgroundTertiary,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
    },
    dateSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    descriptionContainer: {
      gap: Spacing.sm,
    },
    textInput: {
      minHeight: 100,
      padding: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      textAlignVertical: 'top',
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    clearButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    submitButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    listContainer: {
      gap: Spacing.lg,
    },
    emptyState: {
      padding: Spacing['3xl'],
      alignItems: 'center',
      borderRadius: BorderRadius.md,
    },
    workLogCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
      gap: Spacing.md,
    },
    workLogHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    workLogDesc: {
      lineHeight: 22,
    },
    workLogFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    workersTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    workerTag: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
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
      maxHeight: 400,
    },
    projectItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      marginBottom: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    projectItemSelected: {
      backgroundColor: theme.primary,
    },
    modalFooterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalSaveButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      margin: Spacing.lg,
    },
    editFormSection: {
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    editProjectList: {
      maxHeight: 150,
    },
    editProjectItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      marginBottom: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    editProjectItemSelected: {
      backgroundColor: theme.primary,
    },
    editWorkersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    // 模板相关样式
    templateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    templateItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      marginBottom: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    templateItemInfo: {
      flex: 1,
      gap: Spacing.xs,
    },
    templateItemActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    templateActionIcon: {
      padding: Spacing.sm,
    },
    // 批量记录相关样式
    batchModeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
    },
    batchModeSwitch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    dateRangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    dateRangeInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    skipWeekendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
  });
};
