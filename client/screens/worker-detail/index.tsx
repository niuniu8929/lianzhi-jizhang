import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';

interface WorkRecord {
  projectId: string;
  projectName: string;
  date: string;
  description: string;
  hours: number;
}

interface WorkerStats {
  id: string;
  name: string;
  totalHours: number;
  workRecords: WorkRecord[];
}

export default function WorkerDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ workerId: string; workerName: string; year: string; month: string }>();

  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(false);

  const year = params.year || new Date().getFullYear().toString();
  const month = params.month || (new Date().getMonth() + 1).toString();
  const monthLabel = `${year}年${month}月`;

  // 获取人员详细统计
  const fetchWorkerStats = useCallback(async () => {
    if (!params.workerId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/stats/worker/${year}/${month}`
      );
      const data = await response.json();

      const worker = data.stats?.find((w: WorkerStats) => w.id === params.workerId);
      setWorkerStats(worker || null);
    } catch (error) {
      console.error('获取人员统计失败:', error);
      Alert.alert('错误', '获取人员统计失败');
    } finally {
      setLoading(false);
    }
  }, [params.workerId, year, month]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkerStats();
    }, [fetchWorkerStats])
  );

  // 复制到剪贴板
  const handleExport = useCallback(async () => {
    if (!workerStats) return;

    try {
      const workDays = new Set(workerStats.workRecords.map(r => r.date)).size;

      let text = `${monthLabel} ${params.workerName} 工作日明细\n\n`;
      text += `工作天数：${workDays} 天\n`;
      text += `总工作日：${workerStats.totalHours.toFixed(2)} 天\n\n`;
      text += `日期\t项目\t工作日\t工作内容\n`;
      text += `${'─'.repeat(80)}\n`;

      workerStats.workRecords.forEach(record => {
        text += `${record.date}\t${record.projectName}\t${record.hours.toFixed(2)}天\t${record.description}\n`;
      });

      await Clipboard.setStringAsync(text);
      Alert.alert('成功', '数据已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      Alert.alert('错误', '复制失败');
    }
  }, [workerStats, monthLabel, params.workerName]);

  if (!params.workerId) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.container}>
          <ThemedText variant="body" color={theme.textMuted}>参数错误</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 头部 */}
        <ThemedView level="default" style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h2" color={theme.textPrimary}>
              {params.workerName}
            </ThemedText>
            <TouchableOpacity onPress={handleExport}>
              <FontAwesome6 name="clipboard" size={18} color={theme.buttonPrimaryText} />
            </TouchableOpacity>
          </View>

          <ThemedText variant="caption" color={theme.textMuted}>
            {monthLabel}
          </ThemedText>
        </ThemedView>

        {/* 统计卡片 */}
        <ScrollView contentContainerStyle={styles.listContent}>
          {loading ? (
            <ThemedView level="default" style={styles.emptyState}>
              <ThemedText variant="caption" color={theme.textMuted}>
                加载中...
              </ThemedText>
            </ThemedView>
          ) : !workerStats ? (
            <ThemedView level="default" style={styles.emptyState}>
              <ThemedText variant="caption" color={theme.textMuted}>
                暂无数据
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {/* 总计卡片 */}
              <ThemedView level="default" style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <FontAwesome6 name="calendar-check" size={24} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.summaryLabel}>
                    工作天数
                  </ThemedText>
                  <ThemedText variant="h2" color={theme.primary}>
                    {new Set(workerStats.workRecords.map(r => r.date)).size}
                  </ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <FontAwesome6 name="clock" size={24} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.summaryLabel}>
                    总工作日
                  </ThemedText>
                  <ThemedText variant="h2" color={theme.primary}>
                    {workerStats.totalHours.toFixed(2)}
                  </ThemedText>
                </View>
              </ThemedView>

              {/* 工作记录列表 */}
              <ThemedText variant="bodyMedium" color={theme.textSecondary} style={styles.sectionTitle}>
                工作记录
              </ThemedText>

              {workerStats.workRecords.map((record, index) => (
                <ThemedView key={`${record.date}-${index}`} level="default" style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <FontAwesome6 name="calendar" size={14} color={theme.primary} />
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      {record.date}
                    </ThemedText>
                    <ThemedText variant="bodyMedium" color={theme.primary}>
                      {record.hours.toFixed(2)}天
                    </ThemedText>
                  </View>

                  <View style={styles.recordProject}>
                    <FontAwesome6 name="folder" size={14} color={theme.textMuted} />
                    <ThemedText variant="caption" color={theme.textSecondary}>
                      {record.projectName}
                    </ThemedText>
                  </View>

                  <ThemedText variant="body" color={theme.textSecondary} style={styles.recordDescription}>
                    {record.description}
                  </ThemedText>
                </ThemedView>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
