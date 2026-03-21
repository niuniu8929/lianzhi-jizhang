import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    // Tab 切换栏 - 横向大按钮
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.xs,
      gap: Spacing.md,
    },
    tabButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.sm,
      backgroundColor: 'transparent',
    },
    tabButtonActive: {
      backgroundColor: theme.primary,
    },
    // 日期范围选择
    dateRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
    },
    iconButtonSmall: {
      padding: Spacing.sm,
      marginLeft: Spacing.sm,
    },
    // 列表
    list: {
      flex: 1,
    },
    emptyState: {
      padding: Spacing['3xl'],
      alignItems: 'center',
      borderRadius: BorderRadius.md,
    },
    // 总计卡片
    totalCard: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundDefault,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    totalValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.sm,
    },
    // 统计组
    statsGroup: {
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
    },
    statsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    statsHeaderLeft: {
      flex: 1,
      gap: Spacing.xs,
    },
    statsHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    // 详细记录
    statsDetails: {
      padding: Spacing.lg,
      paddingTop: 0,
      gap: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    recordItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    recordLeft: {
      flex: 1,
      gap: Spacing.xs,
    },
    recordDesc: {
      fontStyle: 'italic',
    },
    // Modal 样式
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '90%',
      maxWidth: 400,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    modalBody: {
      gap: Spacing.md,
    },
    dataAction: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      gap: Spacing.lg,
    },
    dataActionText: {
      flex: 1,
    },
  });
};
