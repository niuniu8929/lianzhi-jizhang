import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, Alert, FlatList, ListRenderItem } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Project, DeliveryRecord, InvoiceStatusNames, ProjectStatus } from '@/types';
import { ProjectStorage, TransactionStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

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
// Memoized 送货记录卡片组件（精简版，无图片显示）
// ============================================
interface DeliveryCardProps {
  record: DeliveryRecord;
  index: number;
  totalCount: number;
}

const DeliveryCard = memo(function DeliveryCard({ record, index, totalCount }: DeliveryCardProps) {
  const { theme } = useTheme();
  
  return (
    <ThemedView level="default" style={{
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{
              backgroundColor: theme.accent + '20',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              marginRight: 8,
            }}>
              <ThemedText variant="caption" color={theme.accent}>第 {totalCount - index} 次</ThemedText>
            </View>
            <ThemedText variant="caption" color={theme.textMuted}>
              {formatDate(record.date)}
            </ThemedText>
          </View>
          <ThemedText variant="body" color={theme.textPrimary} numberOfLines={2}>
            {record.description}
          </ThemedText>
        </View>
        {record.amount > 0 && (
          <ThemedText variant="h4" color={theme.primary} style={{ marginLeft: 12 }}>
            {formatCurrency(record.amount)}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
});

// ============================================
// 主组件
// ============================================
export default function ProjectDetailScreen() {
  const { theme, isDark } = useTheme();
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
        recordCount: deliveryRecords.length,
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

  // 渲染送货记录项
  const renderDeliveryItem: ListRenderItem<DeliveryRecord> = useCallback(({ item, index }) => (
    <DeliveryCard 
      record={item} 
      index={index} 
      totalCount={deliveryRecords.length}
    />
  ), [deliveryRecords.length]);

  // 提取 key
  const keyExtractor = useCallback((item: DeliveryRecord) => item.id, []);

  // ============================================
  // 加载状态
  // ============================================
  if (!project) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ThemedView level="root" style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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

  // 列表头部内容
  const ListHeaderComponent = useMemo(() => (
    <>
      {/* 项目基本信息 */}
      <ThemedView level="default" style={{
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: project.description ? Spacing.md : 0 }}>
          <View style={{
            backgroundColor: isDelivery ? theme.accent : theme.primary,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            marginRight: 8,
          }}>
            <ThemedText variant="caption" color="#FFFFFF" style={{ fontSize: 10, fontWeight: '500' }}>
              {isDelivery ? '采购' : '工程'}
            </ThemedText>
          </View>
          <ThemedText variant="h2" color={theme.textPrimary} style={{ flex: 1 }} numberOfLines={2}>
            {project.name}
          </ThemedText>
        </View>

        {project.description && (
          <ThemedText variant="body" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
            {project.description}
          </ThemedText>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, marginRight: 6 }} />
            <ThemedText variant="caption" color={statusColor}>
              {getStatusText(project.status)}
            </ThemedText>
          </View>
          {project.manager && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.md }}>
              <FontAwesome6 name="user" size={12} color={theme.textMuted} />
              <ThemedText variant="caption" color={theme.textSecondary} style={{ marginLeft: 4 }}>
                {project.manager}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>

      {/* 时间规划 */}
      <ThemedView level="default" style={{
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
      }}>
        <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
          时间规划
        </ThemedText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
          <ThemedText variant="caption" color={theme.textMuted}>开始日期</ThemedText>
          <ThemedText variant="body" color={theme.textPrimary}>
            {project.startDate ? formatDate(project.startDate) : '未设置'}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
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
                    ? `(超期 ${Math.abs(countdown)} 天)` 
                    : countdown === 0 
                      ? '(今天)' 
                      : `(倒计时 ${countdown} 天)`
                )}
              </ThemedText>
            )}
          </View>
        </View>
        {project.startDate && project.endDate && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
            <ThemedText variant="caption" color={theme.textMuted}>项目周期</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>
              {calculateProjectDuration(project.startDate, project.endDate)}
            </ThemedText>
          </View>
        )}
        {project.startDate && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <ThemedText variant="caption" color={theme.textMuted}>已运行</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>
              {calculateRunDuration(project.startDate)}
            </ThemedText>
          </View>
        )}
      </ThemedView>

      {/* 财务概况 */}
      <ThemedView level="default" style={{
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
      }}>
        <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
          财务概况
        </ThemedText>
        
        {/* 送货次数（仅零星采购显示） */}
        {isDelivery && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, backgroundColor: theme.accent + '10', padding: Spacing.md, borderRadius: BorderRadius.md }}>
            <FontAwesome6 name="truck" size={20} color={theme.accent} style={{ marginRight: Spacing.sm }} />
            <ThemedText variant="body" color={theme.accent}>
              共 {deliveryStats.recordCount} 次送货
            </ThemedText>
          </View>
        )}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md }}>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="caption" color={theme.textMuted}>
              {isDelivery ? '送货总额' : '合同金额'}
            </ThemedText>
            <ThemedText variant="h2" color={theme.primary} style={{ marginTop: 4 }}>
              {formatCurrency(isDelivery ? deliveryStats.totalAmount : contractAmount)}
            </ThemedText>
          </View>
          {!isDelivery && (
            <View style={{ alignItems: 'center' }}>
              <ThemedText variant="caption" color={theme.textMuted}>结算金额</ThemedText>
              <ThemedText variant="h2" color={theme.textSecondary} style={{ marginTop: 4 }}>
                {formatCurrency(project.settlementAmount ?? 0)}
              </ThemedText>
            </View>
          )}
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md }}>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="caption" color={theme.textMuted}>已收款</ThemedText>
            <ThemedText variant="h3" color={theme.success} style={{ marginTop: 4 }}>
              {formatCurrency(isDelivery ? deliveryStats.receivedAmount : project.receivedAmount)}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              收款率 {collectionRate}%
            </ThemedText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="caption" color={theme.textMuted}>已支出</ThemedText>
            <ThemedText variant="h3" color={theme.error} style={{ marginTop: 4 }}>
              {formatCurrency(totalExpense)}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              占比 {expenseRate}%
            </ThemedText>
          </View>
        </View>
        
        <View style={{ alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: Spacing.md }}>
          <ThemedText variant="caption" color={theme.textMuted}>净收益</ThemedText>
          <ThemedText variant="h2" color={netProfit >= 0 ? theme.success : theme.error} style={{ marginTop: 4 }}>
            {formatCurrency(netProfit)}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            利润率 {profitRate}%
          </ThemedText>
        </View>
      </ThemedView>

      {/* 开票信息 */}
      <ThemedView level="default" style={{
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
      }}>
        <ThemedText variant="h4" color={theme.textSecondary} style={{ marginBottom: Spacing.md }}>
          开票信息
        </ThemedText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: pendingInvoice > 0 ? Spacing.md : 0 }}>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="caption" color={theme.textMuted}>已开票金额</ThemedText>
            <ThemedText variant="h3" color={theme.primary} style={{ marginTop: 4 }}>
              {formatCurrency(isDelivery ? deliveryStats.invoiceAmount : project.invoiceAmount)}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>
              开票率 {invoiceRate}%
            </ThemedText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="caption" color={theme.textMuted}>开票状态</ThemedText>
            <ThemedText variant="h4" color={theme.primary} style={{ marginTop: 8 }}>
              {InvoiceStatusNames[invoiceStatus]}
            </ThemedText>
          </View>
        </View>
        {pendingInvoice > 0 && (
          <View style={{ alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: Spacing.md }}>
            <ThemedText variant="caption" color={theme.textMuted}>待开票金额</ThemedText>
            <ThemedText variant="h3" color={theme.textSecondary} style={{ marginTop: 4 }}>
              {formatCurrency(pendingInvoice)}
            </ThemedText>
          </View>
        )}
      </ThemedView>

      {/* 送货记录标题 - 仅零星采购显示 */}
      {isDelivery && deliveryRecords.length > 0 && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingHorizontal: Spacing.lg, 
          paddingVertical: Spacing.md,
        }}>
          <ThemedText variant="h4" color={theme.textSecondary}>送货记录</ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            共 {deliveryRecords.length} 条
          </ThemedText>
        </View>
      )}

      {/* 空状态 - 仅零星采购显示 */}
      {isDelivery && deliveryRecords.length === 0 && (
        <ThemedView level="default" style={{
          marginHorizontal: Spacing.lg,
          marginBottom: Spacing.md,
          padding: Spacing.xl,
          borderRadius: BorderRadius.lg,
          alignItems: 'center',
        }}>
          <FontAwesome6 name="truck" size={48} color={theme.textMuted} style={{ marginBottom: Spacing.md }} />
          <ThemedText variant="body" color={theme.textSecondary}>
            暂无送货记录
          </ThemedText>
        </ThemedView>
      )}
    </>
  ), [project, isDelivery, statusColor, countdown, deliveryStats, contractAmount, totalExpense, collectionRate, expenseRate, netProfit, profitRate, invoiceRate, pendingInvoice, invoiceStatus, theme, deliveryRecords.length]);

  // 列表底部内容
  const ListFooterComponent = useMemo(() => (
    <>
      {/* 零星采购结账按钮 */}
      {isDelivery && project.status !== 'completed' && (
        <View style={{ marginTop: Spacing.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.xl }}>
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
              style={{ marginRight: Spacing.sm }}
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
    </>
  ), [isDelivery, project.status, deliveryStats, theme, handleSettleProject]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.xl,
          paddingBottom: Spacing.md,
        }}>
          <TouchableOpacity 
            style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }} 
            onPress={() => router.back()}
          >
            <FontAwesome6 name="arrow-left" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>
            项目详情
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* 使用 FlatList 渲染内容 */}
        {isDelivery && deliveryRecords.length > 0 ? (
          <FlatList
            data={deliveryRecords}
            renderItem={renderDeliveryItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
          />
        ) : (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </Screen>
  );
}
