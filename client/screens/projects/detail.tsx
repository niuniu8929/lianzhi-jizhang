import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Project, Transaction, DeliveryRecord, InvoiceStatusNames, ProjectStatus } from '@/types';
import { ProjectStorage, TransactionStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { createStyles } from './styles';

// ============================================
// 辅助函数（移到组件外部，避免重复创建）
// ============================================
function getStatusColor(status: string, theme: Theme) {
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

// 计算项目周期
function calculateProjectDuration(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

// 计算已运行天数
function calculateRunDuration(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
}

// 计算倒计时（距离竣工日期还有多少天）
function calculateCountdown(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ============================================
// Memoized 送货记录卡片组件（无图片版本）
// ============================================
interface DeliveryCardProps {
  record: DeliveryRecord;
  index: number;
  totalCount: number;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}

const DeliveryCard = memo(function DeliveryCard({ record, index, totalCount, theme, styles }: DeliveryCardProps) {
  return (
    <ThemedView level="default" style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.typeBadge, { backgroundColor: theme.accent + '20', marginRight: 8 }]}>
            <ThemedText variant="caption" color={theme.accent}>
              第 {totalCount - index} 次
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
      <View style={styles.transactionFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ThemedText variant="caption" color={theme.textMuted}>
            {formatDate(record.date)}
          </ThemedText>
          {record.images && record.images.length > 0 && (
            <ThemedText variant="caption" color={theme.textMuted}>
              {record.images.length} 张图片
            </ThemedText>
          )}
        </View>
      </View>
    </ThemedView>
  );
});

// ============================================
// 主组件
// ============================================
export default function ProjectDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  // 数据加载函数
  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      // 并行加载数据
      const [projectData, transactionsData, deliveryRecordsData] = await Promise.all([
        ProjectStorage.getById(id),
        TransactionStorage.getByProjectId(id),
        DeliveryRecordStorage.getByProjectId(id),
      ]);

      if (!projectData) {
        router.back();
        return;
      }

      // 计算总支出
      const expense = transactionsData.reduce((sum, t) => sum + t.amount, 0);
      
      setProject(projectData);
      setDeliveryRecords([...deliveryRecordsData].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setTotalExpense(expense);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ============================================
  // 计算属性（合并计算，减少依赖链）
  // ============================================
  const computedData = useMemo(() => {
    const deliveryTotalAmount = deliveryRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const deliveryReceivedAmount = deliveryRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0);
    const deliveryInvoiceAmount = deliveryRecords.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0);
    const totalImages = deliveryRecords.reduce((sum, r) => sum + (r.images?.length || 0), 0);
    
    const contractAmount = project?.contractAmount ?? 0;
    const projectReceivedAmount = project?.receivedAmount ?? 0;
    const projectInvoiceAmount = project?.invoiceAmount ?? 0;
    const isDelivery = project?.projectType === 'delivery';
    
    // 计算净收益
    const netProfit = isDelivery 
      ? deliveryReceivedAmount - totalExpense 
      : projectReceivedAmount - totalExpense;
    
    // 计算各项比率
    const base = isDelivery ? deliveryTotalAmount : contractAmount;
    const received = isDelivery ? deliveryReceivedAmount : projectReceivedAmount;
    const invoiced = isDelivery ? deliveryInvoiceAmount : projectInvoiceAmount;
    
    const collectionRate = base > 0 ? ((received / base) * 100).toFixed(1) : '0';
    const expenseRate = base > 0 ? ((totalExpense / base) * 100).toFixed(1) : '0';
    const profitRate = base > 0 ? ((netProfit / base) * 100).toFixed(1) : '0';
    const invoiceRate = base > 0 ? ((invoiced / base) * 100).toFixed(1) : '0';
    const pendingInvoice = Math.max(0, base - invoiced);
    
    // 计算开票状态
    const invoiceStatus: 'none' | 'partial' | 'completed' = isDelivery
      ? (deliveryInvoiceAmount === 0 ? 'none' : deliveryInvoiceAmount >= deliveryTotalAmount ? 'completed' : 'partial')
      : (project?.invoiceStatus ?? 'none');
    
    return {
      deliveryStats: { 
        totalAmount: deliveryTotalAmount, 
        receivedAmount: deliveryReceivedAmount, 
        invoiceAmount: deliveryInvoiceAmount, 
        totalImages 
      },
      contractAmount,
      netProfit,
      collectionRate,
      expenseRate,
      profitRate,
      invoiceRate,
      pendingInvoice,
      invoiceStatus,
      isDelivery,
    };
  }, [deliveryRecords, project, totalExpense]);

  // 零星采购结账处理
  const handleSettleProject = useCallback(async () => {
    if (!project || !computedData.isDelivery) return;

    const { totalAmount, receivedAmount } = computedData.deliveryStats;

    if (receivedAmount < totalAmount) {
      Alert.alert('无法结账', `收款金额（¥${receivedAmount.toLocaleString()}）未达到送货总额（¥${totalAmount.toLocaleString()}）`);
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
  }, [project, computedData, router]);

  // ============================================
  // 加载状态
  // ============================================
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

  const statusColor = getStatusColor(project.status, theme);
  const {
    deliveryStats,
    contractAmount,
    netProfit,
    collectionRate,
    expenseRate,
    profitRate,
    invoiceRate,
    pendingInvoice,
    invoiceStatus,
    isDelivery,
  } = computedData;

  // 时间相关计算
  const countdown = project.endDate ? calculateCountdown(project.endDate) : null;

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.headerTitle}>
            项目详情
          </ThemedText>
          <View style={styles.backButton} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        >
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

          {/* 时间规划 */}
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
              <ThemedText variant="caption" color={theme.textMuted}>
                {isDelivery ? '预计完成' : '竣工日期'}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText variant="body" color={project.endDate && isOverdue(project.endDate) ? theme.error : theme.textPrimary}>
                  {project.endDate ? formatDate(project.endDate) : '未设置'}
                </ThemedText>
                {project.endDate && (
                  <ThemedText variant="caption" color={countdown !== null && countdown < 0 ? theme.error : (countdown !== null && countdown <= 7 ? theme.accent : theme.success)} style={{ marginLeft: 8 }}>
                    {countdown !== null && (
                      countdown < 0 
                        ? `(已过期 ${Math.abs(countdown)} 天)` 
                        : countdown === 0 
                          ? '(今天到期)' 
                          : `(倒计时 ${countdown} 天)`
                    )}
                  </ThemedText>
                )}
              </View>
            </View>
            {project.startDate && project.endDate && (
              <View style={styles.detailRow}>
                <ThemedText variant="caption" color={theme.textMuted}>项目周期</ThemedText>
                <ThemedText variant="body" color={theme.textPrimary}>
                  {calculateProjectDuration(project.startDate, project.endDate)}
                </ThemedText>
              </View>
            )}
            {project.startDate && (
              <View style={styles.detailRow}>
                <ThemedText variant="caption" color={theme.textMuted}>已运行</ThemedText>
                <ThemedText variant="body" color={theme.textPrimary}>
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
                  {formatCurrency(isDelivery ? deliveryStats.receivedAmount : project.receivedAmount)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  收款率 {collectionRate}%
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>已支出</ThemedText>
                <ThemedText variant="h3" color={theme.error} style={styles.statValue}>
                  {formatCurrency(totalExpense)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  占比 {expenseRate}%
                </ThemedText>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>净收益</ThemedText>
                <ThemedText variant="h3" color={netProfit >= 0 ? theme.success : theme.error} style={styles.statValue}>
                  {formatCurrency(netProfit)}
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
                  {formatCurrency(isDelivery ? deliveryStats.invoiceAmount : project.invoiceAmount)}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  开票率 {invoiceRate}%
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText variant="caption" color={theme.textMuted}>开票状态</ThemedText>
                <ThemedText variant="h3" color={theme.primary} style={styles.statValue}>
                  {InvoiceStatusNames[invoiceStatus]}
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

          {/* 送货记录 - 仅零星采购显示 */}
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
              </ThemedView>

              {/* 送货记录列表（无图片，纯文本） */}
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
                  <DeliveryCard 
                    key={record.id}
                    record={record} 
                    index={index} 
                    totalCount={deliveryRecords.length}
                    theme={theme}
                    styles={styles}
                  />
                ))
              )}
            </>
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
                    ? '确认结账'
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
