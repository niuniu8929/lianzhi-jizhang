import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Project, DeliveryRecord, InvoiceStatusNames } from '@/types';
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
      const [projectData, transactionsData, deliveryRecordsData] = await Promise.all([
        ProjectStorage.getById(id),
        TransactionStorage.getByProjectId(id),
        DeliveryRecordStorage.getByProjectId(id),
      ]);

      if (!projectData) {
        router.back();
        return;
      }

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
  // 计算属性
  // ============================================
  const deliveryTotalAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
  [deliveryRecords]);

  const deliveryReceivedAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0),
  [deliveryRecords]);

  const deliveryInvoiceAmount = useMemo(() => 
    deliveryRecords.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0),
  [deliveryRecords]);

  // 使用 useMemo 缓存 isDelivery
  const isDelivery = useMemo(() => project?.projectType === 'delivery', [project?.projectType]);
  
  const contractAmount = project?.contractAmount ?? 0;
  const statusColor = project ? getStatusColor(project.status, theme) : theme.textMuted;
  const countdown = project?.endDate ? calculateCountdown(project.endDate) : null;

  const base = isDelivery ? deliveryTotalAmount : contractAmount;
  const received = isDelivery ? deliveryReceivedAmount : (project?.receivedAmount ?? 0);
  const invoiced = isDelivery ? deliveryInvoiceAmount : (project?.invoiceAmount ?? 0);
  const netProfit = isDelivery 
    ? deliveryReceivedAmount - totalExpense 
    : (project?.receivedAmount ?? 0) - totalExpense;
  
  const collectionRate = base > 0 ? ((received / base) * 100).toFixed(1) : '0';
  const expenseRate = base > 0 ? ((totalExpense / base) * 100).toFixed(1) : '0';
  const profitRate = base > 0 ? ((netProfit / base) * 100).toFixed(1) : '0';
  const invoiceRate = base > 0 ? ((invoiced / base) * 100).toFixed(1) : '0';
  const pendingInvoice = Math.max(0, base - invoiced);
  
  const invoiceStatus: 'none' | 'partial' | 'completed' = isDelivery
    ? (deliveryInvoiceAmount === 0 ? 'none' : deliveryInvoiceAmount >= deliveryTotalAmount ? 'completed' : 'partial')
    : (project?.invoiceStatus ?? 'none');

  const deliveryStats = useMemo(() => ({
    totalAmount: deliveryTotalAmount,
    receivedAmount: deliveryReceivedAmount,
    invoiceAmount: deliveryInvoiceAmount,
    recordCount: deliveryRecords.length,
  }), [deliveryTotalAmount, deliveryReceivedAmount, deliveryInvoiceAmount, deliveryRecords.length]);

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

        {/* 使用 ScrollView 包裹所有内容 */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing['6xl'] }}
        >
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
                  {formatCurrency(isDelivery ? deliveryTotalAmount : contractAmount)}
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
                  {formatCurrency(isDelivery ? deliveryReceivedAmount : project.receivedAmount)}
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
                  {formatCurrency(isDelivery ? deliveryInvoiceAmount : project.invoiceAmount)}
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

          {/* 送货记录列表 */}
          {isDelivery && deliveryRecords.length > 0 && (
            <>
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
              
              {deliveryRecords.map((record, index) => (
                <DeliveryCard 
                  key={record.id}
                  record={record} 
                  index={index} 
                  totalCount={deliveryRecords.length}
                />
              ))}
            </>
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
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
