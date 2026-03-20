import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Project, Transaction, DeliveryRecord, InvoiceStatusNames, ProjectStatus } from '@/types';
import { ProjectStorage, TransactionStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate, calculateProjectStats } from '@/utils/helpers';
import { TransactionTypeNames } from '@/types';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { TouchableOpacity, Alert } from 'react-native';

// 辅助函数移到组件外部
function getStatusColor(status: string, theme: any) {
  switch (status) {
    case 'active': return theme.success;
    case 'completed': return theme.primary;
    case 'paused': return theme.textMuted;
    default: return theme.textMuted;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active': return '进行中';
    case 'completed': return '已完成';
    case 'paused': return '已暂停';
    default: return status;
  }
}

function isOverdue(date: string) {
  return new Date(date) < new Date();
}

function calculateProjectDuration(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

function calculateRunDuration(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

function getTransactionTypeColor(type: string, theme: any) {
  switch (type) {
    case 'material': return theme.primary;
    case 'equipment': return theme.success;
    case 'labor': return theme.accent;
    default: return theme.textSecondary;
  }
}

export default function ProjectDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [stats, setStats] = useState({ totalExpense: 0, netProfit: 0 });

  const loadData = useCallback(async () => {
    if (!id) return;

    const projectData = await ProjectStorage.getById(id);
    if (!projectData) {
      router.back();
      return;
    }

    const transactionsData = await TransactionStorage.getByProjectId(id);
    const deliveryRecordsData = await DeliveryRecordStorage.getByProjectId(id);
    const projectStats = await calculateProjectStats(projectData);

    setProject(projectData);
    setTransactions(transactionsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setDeliveryRecords(deliveryRecordsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setStats(projectStats);
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 缓存计算结果
  const deliveryStats = useMemo(() => {
    const totalAmount = deliveryRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const receivedAmount = deliveryRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0);
    const invoiceAmount = deliveryRecords.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0);
    const totalImages = deliveryRecords.reduce((sum, r) => sum + r.images.length, 0);
    return { totalAmount, receivedAmount, invoiceAmount, totalImages };
  }, [deliveryRecords]);

  const contractAmount = useMemo(() => project?.contractAmount ?? 0, [project?.contractAmount]);
  const receivedAmount = useMemo(() => project?.receivedAmount ?? 0, [project?.receivedAmount]);
  const invoiceAmount = useMemo(() => project?.invoiceAmount ?? 0, [project?.invoiceAmount]);

  const collectionRate = useMemo(() => {
    const base = project?.projectType === 'delivery' ? deliveryStats.totalAmount : contractAmount;
    const received = project?.projectType === 'delivery' ? deliveryStats.receivedAmount : receivedAmount;
    return base > 0 ? ((received / base) * 100).toFixed(1) : '0';
  }, [project?.projectType, deliveryStats, contractAmount, receivedAmount]);

  const expenseRate = useMemo(() => {
    const base = project?.projectType === 'delivery' ? deliveryStats.totalAmount : contractAmount;
    return base > 0 ? ((stats.totalExpense / base) * 100).toFixed(1) : '0';
  }, [project?.projectType, deliveryStats.totalAmount, contractAmount, stats.totalExpense]);

  const profitRate = useMemo(() => {
    const base = project?.projectType === 'delivery' ? deliveryStats.totalAmount : contractAmount;
    return base > 0 ? ((stats.netProfit / base) * 100).toFixed(1) : '0';
  }, [project?.projectType, deliveryStats.totalAmount, contractAmount, stats.netProfit]);

  const invoiceRate = useMemo(() => {
    const base = project?.projectType === 'delivery' ? deliveryStats.totalAmount : contractAmount;
    const invoiced = project?.projectType === 'delivery' ? deliveryStats.invoiceAmount : invoiceAmount;
    return base > 0 ? ((invoiced / base) * 100).toFixed(1) : '0';
  }, [project?.projectType, deliveryStats, contractAmount, invoiceAmount]);

  const pendingInvoice = useMemo(() => {
    const base = project?.projectType === 'delivery' ? deliveryStats.totalAmount : contractAmount;
    const invoiced = project?.projectType === 'delivery' ? deliveryStats.invoiceAmount : invoiceAmount;
    return base - invoiced;
  }, [project?.projectType, deliveryStats, contractAmount, invoiceAmount]);

  // 按类型分组的支出统计
  const expenseByType = useMemo(() => {
    const result: Array<{ type: string; name: string; total: number; count: number; percent: number }> = [];
    if (stats.totalExpense === 0) return result;

    (Object.keys(TransactionTypeNames) as Array<keyof typeof TransactionTypeNames>).forEach((type) => {
      const typeTransactions = transactions.filter(t => t.type === type);
      const total = typeTransactions.reduce((sum, t) => sum + t.amount, 0);
      if (total > 0) {
        result.push({
          type,
          name: TransactionTypeNames[type],
          total,
          count: typeTransactions.length,
          percent: (total / stats.totalExpense) * 100
        });
      }
    });
    return result;
  }, [transactions, stats.totalExpense]);

  // 零星采购结账处理
  const handleSettleProject = useCallback(async () => {
    if (!project || project.projectType !== 'delivery') return;

    // 验证：已收款必须等于累计送货金额
    const totalAmount = deliveryStats.totalAmount;
    const received = deliveryStats.receivedAmount;

    if (received < totalAmount) {
      Alert.alert('无法结账', `收款金额（¥${received.toLocaleString()}）未达到送货总额（¥${totalAmount.toLocaleString()}）`);
      return;
    }

    Alert.alert(
      '确认结账',
      '结账后项目将标记为已完成，不再显示在项目列表中。确定要结账吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定结账',
          style: 'default',
          onPress: async () => {
            const updatedProject: Project = {
              ...project,
              status: 'completed' as ProjectStatus,
              updatedAt: new Date().toISOString(),
            };
            const success = await ProjectStorage.save(updatedProject);
            if (success) {
              Alert.alert('结账成功', '项目已结账，可在统计页面查看', [
                { text: '确定', onPress: () => router.back() }
              ]);
            } else {
              Alert.alert('错误', '结账失败，请重试');
            }
          }
        }
      ]
    );
  }, [project, deliveryStats, router]);

  if (!project) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={styles.container}>
          <View style={styles.loadingContainer}>
            <ThemedText variant="body" color={theme.textMuted}>加载中...</ThemedText>
          </View>
        </ThemedView>
      </Screen>
    );
  }

  const isDelivery = project.projectType === 'delivery';
  const statusColor = getStatusColor(project.status, theme);

  // 计算开票状态（零星采购根据送货记录计算）
  const calculatedInvoiceStatus: 'none' | 'partial' | 'completed' = isDelivery
    ? (deliveryStats.invoiceAmount === 0
        ? 'none'
        : deliveryStats.invoiceAmount >= deliveryStats.totalAmount
          ? 'completed'
          : 'partial')
    : (project.invoiceStatus ?? 'none');

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <View style={styles.backButton} />
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            项目详情
          </ThemedText>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 项目基本信息 */}
          <ThemedView level="default" style={styles.infoCard}>
            <View style={styles.projectTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.typeBadge, { backgroundColor: isDelivery ? theme.accent : theme.primary }]}>
                  <ThemedText variant="caption" color="#FFFFFF" style={{ fontSize: 10, fontWeight: '500' }}>
                    {isDelivery ? '采购' : '工程'}
                  </ThemedText>
                </View>
                <ThemedText variant="h2" color={theme.textPrimary} style={styles.detailProjectName}>
                  {project.name}
                </ThemedText>
              </View>
            </View>

            {project.description && (
              <ThemedText variant="body" color={theme.textSecondary} style={styles.projectDescription}>
                {project.description}
              </ThemedText>
            )}

            <View style={styles.projectMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <ThemedText variant="caption" color={statusColor} style={styles.statusBadgeText}>
                  {getStatusText(project.status)}
                </ThemedText>
              </View>
              {project.manager && (
                <View style={styles.metaItem}>
                  <FontAwesome6 name="user" size={12} color={theme.textMuted} />
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.metaText}>
                    {project.manager}
                  </ThemedText>
                </View>
              )}
            </View>
          </ThemedView>

          {/* 时间信息 */}
          <ThemedView level="default" style={styles.statsCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.statsTitle}>
              时间规划
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText variant="caption" color={theme.textMuted}>开始日期</ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {project.startDate ? formatDate(project.startDate) : '未设置'}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText variant="caption" color={theme.textMuted}>预计完成</ThemedText>
              <ThemedText variant="body" color={project.endDate && isOverdue(project.endDate) ? theme.error : theme.textPrimary}>
                {project.endDate ? formatDate(project.endDate) : '未设置'}
                {project.endDate && isOverdue(project.endDate) && ' (已过期)'}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText variant="caption" color={theme.textMuted}>创建时间</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                {formatDate(project.createdAt)}
              </ThemedText>
            </View>
            {project.startDate && project.endDate && (
              <View style={styles.detailRow}>
                <ThemedText variant="caption" color={theme.textMuted}>项目周期</ThemedText>
                <ThemedText variant="caption" color={theme.textPrimary}>
                  {calculateProjectDuration(project.startDate, project.endDate)}
                </ThemedText>
              </View>
            )}
            {project.startDate && (
              <View style={styles.detailRow}>
                <ThemedText variant="caption" color={theme.textMuted}>已运行</ThemedText>
                <ThemedText variant="caption" color={theme.textPrimary}>
                  {calculateRunDuration(project.startDate)}
                </ThemedText>
              </View>
            )}
          </ThemedView>

          {/* 财务概况 */}
          <ThemedView level="default" style={styles.statsCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.statsTitle}>
              财务概况
            </ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {isDelivery ? '送货总额' : '合同金额'}
                </ThemedText>
                <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                  {formatCurrency(isDelivery ? deliveryStats.totalAmount : contractAmount)}
                </ThemedText>
              </View>
              {!isDelivery && (
                <View style={styles.statItem}>
                  <ThemedText variant="caption" color={theme.textMuted}>结算金额</ThemedText>
                  <ThemedText variant="h3" color={theme.textSecondary} style={styles.statValue}>
                    {formatCurrency(project.settlementAmount ?? 0)}
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>已收款</ThemedText>
                <ThemedText variant="h3" color={theme.success} style={styles.statValue}>
                  {formatCurrency(isDelivery ? deliveryStats.receivedAmount : receivedAmount)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  收款率 {collectionRate}%
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>已支出</ThemedText>
                <ThemedText variant="h3" color={theme.error} style={styles.statValue}>
                  {formatCurrency(stats.totalExpense)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  占比 {expenseRate}%
                </ThemedText>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>净收益</ThemedText>
                <ThemedText variant="h3" color={stats.netProfit >= 0 ? theme.success : theme.error} style={styles.statValue}>
                  {formatCurrency(stats.netProfit)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  利润率 {profitRate}%
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* 开票信息 */}
          <ThemedView level="default" style={styles.statsCard}>
            <ThemedText variant="h4" color={theme.textSecondary} style={styles.statsTitle}>
              开票信息
            </ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>已开票金额</ThemedText>
                <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                  {formatCurrency(isDelivery ? deliveryStats.invoiceAmount : invoiceAmount)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  开票率 {invoiceRate}%
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>开票状态</ThemedText>
                <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                  {InvoiceStatusNames[calculatedInvoiceStatus]}
                </ThemedText>
              </View>
            </View>
            {pendingInvoice > 0 && (
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <ThemedText variant="caption" color={theme.textMuted}>待开票金额</ThemedText>
                  <ThemedText variant="h3" color={theme.textSecondary} style={styles.statValue}>
                    {formatCurrency(pendingInvoice)}
                  </ThemedText>
                </View>
              </View>
            )}
          </ThemedView>

          {/* 支出分类统计 */}
          {expenseByType.length > 0 && (
            <ThemedView level="default" style={styles.statsCard}>
              <ThemedText variant="h4" color={theme.textSecondary} style={styles.statsTitle}>
                支出分类统计
              </ThemedText>
              {expenseByType.map((item) => (
                <View key={item.type} style={styles.expenseTypeRow}>
                  <View style={styles.expenseTypeHeader}>
                    <View style={[styles.typeDot, { backgroundColor: getTransactionTypeColor(item.type, theme) }]} />
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {item.name} ({item.count}笔)
                    </ThemedText>
                  </View>
                  <View style={styles.expenseTypeValues}>
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {formatCurrency(item.total)}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {item.percent.toFixed(1)}%
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ThemedView>
          )}

          {/* 送货记录 - 仅送货项目显示 */}
          {isDelivery && (
            <>
              {/* 送货统计 */}
              <ThemedView level="default" style={styles.statsCard}>
                <ThemedText variant="h4" color={theme.textSecondary} style={styles.statsTitle}>
                  送货统计
                </ThemedText>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>送货次数</ThemedText>
                    <ThemedText variant="h3" color={theme.accent} style={styles.statValue}>
                      {deliveryRecords.length}
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>总图片数</ThemedText>
                    <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                      {deliveryStats.totalImages}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>送货总额</ThemedText>
                    <ThemedText variant="h3" color={theme.success} style={styles.statValue}>
                      {formatCurrency(deliveryStats.totalAmount)}
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>已开票</ThemedText>
                    <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                      {formatCurrency(deliveryStats.invoiceAmount)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>已收款</ThemedText>
                    <ThemedText variant="h3" color={theme.success} style={styles.statValue}>
                      {formatCurrency(deliveryStats.receivedAmount)}
                    </ThemedText>
                  </View>
                </View>
                {deliveryRecords.length > 0 && (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <ThemedText variant="caption" color={theme.textMuted}>首次送货</ThemedText>
                      <ThemedText variant="body" color={theme.textPrimary}>
                        {formatDate(deliveryRecords[deliveryRecords.length - 1].date)}
                      </ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <ThemedText variant="caption" color={theme.textMuted}>最近送货</ThemedText>
                      <ThemedText variant="body" color={theme.textPrimary}>
                        {formatDate(deliveryRecords[0].date)}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </ThemedView>

              {/* 送货记录列表 */}
              <View style={styles.sectionHeader}>
                <ThemedText variant="h4" color={theme.textSecondary}>送货记录</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  共 {deliveryRecords.length} 条
                </ThemedText>
              </View>

              {deliveryRecords.length === 0 ? (
                <ThemedView level="default" style={styles.emptyCard}>
                  <FontAwesome6 name="truck" size={48} color={theme.textMuted} style={styles.emptyIcon} />
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                    暂无送货记录
                  </ThemedText>
                </ThemedView>
              ) : (
                deliveryRecords.map((record, index) => (
                  <ThemedView key={record.id} level="default" style={styles.transactionCard}>
                    <View style={styles.transactionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.typeBadge, { backgroundColor: theme.accent + '20', marginRight: 8 }]}>
                          <ThemedText variant="caption" color={theme.accent}>
                            第 {deliveryRecords.length - index} 次
                          </ThemedText>
                        </View>
                        <ThemedText variant="body" color={theme.textPrimary} style={{ flex: 1 }} numberOfLines={2}>
                          {record.description}
                        </ThemedText>
                      </View>
                      {record.amount > 0 && (
                        <ThemedText variant="h4" color={theme.primary}>
                          {formatCurrency(record.amount)}
                        </ThemedText>
                      )}
                    </View>
                    {record.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                        {record.images.slice(0, 5).map((img, idx) => (
                          <Image 
                            key={idx} 
                            source={{ uri: img }} 
                            style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }}
                            resizeMode="cover"
                          />
                        ))}
                        {record.images.length > 5 && (
                          <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: theme.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }}>
                            <ThemedText variant="caption" color={theme.textMuted}>+{record.images.length - 5}</ThemedText>
                          </View>
                        )}
                      </ScrollView>
                    )}
                    <View style={styles.transactionFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          {formatDate(record.date)}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          {record.images.length} 张图片
                        </ThemedText>
                      </View>
                    </View>
                  </ThemedView>
                ))
              )}
            </>
          )}

          {/* 交易记录 */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textSecondary}>交易记录</ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              共 {transactions.length} 条
            </ThemedText>
          </View>

          {transactions.length === 0 ? (
            <ThemedView level="default" style={styles.emptyCard}>
              <FontAwesome6 name="receipt" size={48} color={theme.textMuted} style={styles.emptyIcon} />
              <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                暂无交易记录
              </ThemedText>
            </ThemedView>
          ) : (
            transactions.map((transaction) => (
              <ThemedView key={transaction.id} level="default" style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionTypeContainer}>
                    <View style={[styles.transactionTypeBadge, { backgroundColor: getTransactionTypeColor(transaction.type, theme) + '20' }]}>
                      <ThemedText variant="caption" color={getTransactionTypeColor(transaction.type, theme)} style={styles.transactionTypeText}>
                        {TransactionTypeNames[transaction.type]}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="h4" color={theme.error} style={styles.transactionAmount}>
                    -{formatCurrency(transaction.amount)}
                  </ThemedText>
                </View>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.transactionDescription}>
                  {transaction.description}
                </ThemedText>
                <View style={styles.transactionFooter}>
                  <ThemedText variant="caption" color={theme.textMuted}>
                    {formatDate(transaction.date)}
                  </ThemedText>
                </View>
              </ThemedView>
            ))
          )}

          {/* 零星采购结账按钮 */}
          {isDelivery && project.status !== 'completed' && (
            <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}>
              <TouchableOpacity
                style={{
                  backgroundColor: deliveryStats.receivedAmount >= deliveryStats.totalAmount && deliveryStats.totalAmount > 0
                    ? theme.success
                    : theme.backgroundTertiary,
                  paddingVertical: Spacing.lg,
                  paddingHorizontal: Spacing.xl,
                  borderRadius: BorderRadius.lg,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: Spacing.sm,
                }}
                onPress={handleSettleProject}
                disabled={deliveryStats.receivedAmount < deliveryStats.totalAmount || deliveryStats.totalAmount === 0}
              >
                <FontAwesome6
                  name="circle-check"
                  size={20}
                  color={deliveryStats.receivedAmount >= deliveryStats.totalAmount && deliveryStats.totalAmount > 0
                    ? '#FFFFFF'
                    : theme.textMuted}
                />
                <ThemedText
                  variant="body"
                  color={deliveryStats.receivedAmount >= deliveryStats.totalAmount && deliveryStats.totalAmount > 0
                    ? '#FFFFFF'
                    : theme.textMuted}
                  style={{ fontWeight: '600' }}
                >
                  {deliveryStats.receivedAmount >= deliveryStats.totalAmount && deliveryStats.totalAmount > 0
                    ? '已结账'
                    : `未收款 ¥${(deliveryStats.totalAmount - deliveryStats.receivedAmount).toLocaleString()}，无法结账`}
                </ThemedText>
              </TouchableOpacity>
              {deliveryStats.receivedAmount < deliveryStats.totalAmount && (
                <ThemedText variant="caption" color={theme.textMuted} style={{ textAlign: 'center', marginTop: Spacing.sm }}>
                  收款金额达到送货总额后可结账
                </ThemedText>
              )}
            </View>
          )}

          <View style={{ height: Spacing['6xl'] }} />
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
