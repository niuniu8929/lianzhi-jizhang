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

interface ProjectWorker {
  id: string;
  name: string;
  hours: number;
}

interface ProjectStats {
  id: string;
  name: string;
  totalHours: number;
  workers: ProjectWorker[];
}

export default function ProjectDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ projectId: string; projectName: string; year: string; month: string }>();

  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);

  const year = params.year || new Date().getFullYear().toString();
  const month = params.month || (new Date().getMonth() + 1).toString();
  const monthLabel = `${year}年${month}月`;

  // 获取项目详细统计
  const fetchProjectStats = useCallback(async () => {
    if (!params.projectId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/stats/project/${year}/${month}`
      );
      const data = await response.json();

      const project = data.stats?.find((p: ProjectStats) => p.id === params.projectId);
      setProjectStats(project || null);
    } catch (error) {
      console.error('获取项目统计失败:', error);
      Alert.alert('错误', '获取项目统计失败');
    } finally {
      setLoading(false);
    }
  }, [params.projectId, year, month]);

  useFocusEffect(
    useCallback(() => {
      fetchProjectStats();
    }, [fetchProjectStats])
  );

  // 复制到剪贴板
  const handleExport = useCallback(async () => {
    if (!projectStats) return;

    try {
      let text = `${monthLabel} ${params.projectName} 工作日明细\n\n`;
      text += `参与人数：${projectStats.workers.length} 人\n`;
      text += `总工作日：${projectStats.totalHours.toFixed(2)} 天\n\n`;
      text += `人员姓名\t工作日\n`;
      text += `${'─'.repeat(40)}\n`;

      projectStats.workers.forEach(worker => {
        text += `${worker.name}\t${worker.hours.toFixed(2)}天\n`;
      });

      await Clipboard.setStringAsync(text);
      Alert.alert('成功', '数据已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      Alert.alert('错误', '复制失败');
    }
  }, [projectStats, monthLabel, params.projectName]);

  if (!params.projectId) {
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
              {params.projectName}
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
          ) : !projectStats ? (
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
                  <FontAwesome6 name="users" size={24} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.summaryLabel}>
                    参与人数
                  </ThemedText>
                  <ThemedText variant="h2" color={theme.primary}>
                    {projectStats.workers.length}
                  </ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <FontAwesome6 name="clock" size={24} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.summaryLabel}>
                    总工作日
                  </ThemedText>
                  <ThemedText variant="h2" color={theme.primary}>
                    {projectStats.totalHours.toFixed(2)}
                  </ThemedText>
                </View>
              </ThemedView>

              {/* 人员列表 */}
              <ThemedText variant="bodyMedium" color={theme.textSecondary} style={styles.sectionTitle}>
                参与人员
              </ThemedText>

              {projectStats.workers.map(worker => (
                <ThemedView key={worker.id} level="default" style={styles.workerCard}>
                  <View style={styles.workerInfo}>
                    <FontAwesome6 name="user" size={16} color={theme.textMuted} />
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      {worker.name}
                    </ThemedText>
                  </View>
                  <ThemedText variant="bodyMedium" color={theme.primary}>
                    {worker.hours.toFixed(2)}天
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
