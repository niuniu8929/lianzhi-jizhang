import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { createStyles } from './styles';
import {
  workLogService,
  exportAllData,
  importAllData,
  exportDateRangeCSV,
  exportProjectSummaryByDateRange,
  exportWorkerSummaryByDateRange,
  type WorkerHours,
  type ProjectHours,
} from '@/services/LocalStorage';

/**
 * 解析 YYYY-MM-DD 格式的日期，避免时区偏移问题
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取今天的日期（不含时间部分）
 */
function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

interface WorkerRecord {
  date: string;
  projectId: number;
  projectName: string;
  description: string;
  hours: number;
}

interface WorkerStatsWithDetails {
  workerId: number;
  workerName: string;
  totalHours: number;
  records: WorkerRecord[];
}

interface ProjectRecord {
  date: string;
  workerId: number;
  workerName: string;
  description: string;
  hours: number;
}

interface ProjectStatsWithDetails {
  projectId: number;
  projectName: string;
  totalHours: number;
  records: ProjectRecord[];
}

export default function StatsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // 日期范围状态
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = getToday();
    return new Date(today.getFullYear(), today.getMonth(), 1); // 本月第一天
  });
  const [endDate, setEndDate] = useState<Date>(getToday);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [statsMode, setStatsMode] = useState<'worker' | 'project'>('worker');
  const [workerStats, setWorkerStats] = useState<WorkerStatsWithDetails[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStatsWithDetails[]>([]);
  const [showDataModal, setShowDataModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const fetchStats = useCallback(async () => {
    try {
      // 设置日期范围为当天的开始和结束
      const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

      // 获取按人员详细统计
      const workers = await workLogService.getWorkerStatsByDateRange(rangeStart, rangeEnd);

      // 获取所有工时记录
      const allLogs = await workLogService.getAll();

      // 筛选日期范围内的记录
      const filteredLogs = allLogs.filter(log => {
        const logDate = parseLocalDate(log.date);
        return logDate >= rangeStart && logDate <= rangeEnd;
      });

      // 按人员分组详细记录
      const workerMap = new Map<number, WorkerStatsWithDetails>();

      workers.forEach(worker => {
        const workerRecords = filteredLogs
          .filter(log => log.workers.some(w => w.id === worker.workerId))
          .flatMap(log =>
            log.workers
              .filter(w => w.id === worker.workerId)
              .map(w => ({
                date: log.date,
                projectId: log.projectId,
                projectName: log.projectName,
                description: log.description,
                hours: w.hours,
              }))
          );

        workerMap.set(worker.workerId, {
          workerId: worker.workerId,
          workerName: worker.workerName,
          totalHours: worker.totalHours,
          records: workerRecords,
        });
      });

      setWorkerStats(Array.from(workerMap.values()).sort((a, b) => b.totalHours - a.totalHours));

      // ========== 获取按项目详细统计 ==========

      const projects = await workLogService.getProjectStatsByDateRange(rangeStart, rangeEnd);

      // 按项目分组详细记录
      const projectMap = new Map<number, ProjectStatsWithDetails>();

      projects.forEach(project => {
        const projectRecords = filteredLogs
          .filter(log => log.projectId === project.projectId)
          .flatMap(log =>
            log.workers.map(w => ({
              date: log.date,
              workerId: w.id,
              workerName: w.name,
              description: log.description,
              hours: w.hours,
            }))
          );

        projectMap.set(project.projectId, {
          projectId: project.projectId,
          projectName: project.projectName,
          totalHours: project.totalHours,
          records: projectRecords,
        });
      });

      setProjectStats(Array.from(projectMap.values()).sort((a, b) => b.totalHours - a.totalHours));
    } catch (error) {
      console.error('获取统计数据失败:', error);
      Alert.alert('错误', '获取统计数据失败');
    }
  }, [startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleStartDateChange = (date: Date | undefined) => {
    setShowStartPicker(false);
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setShowEndPicker(false);
    if (date) {
      setEndDate(date);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 导出数据为 JSON 文件
  const handleExportData = async () => {
    try {
      const jsonData = await exportAllData();

      const fileName = `workhours_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, jsonData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: '导出数据',
        });
      } else {
        Alert.alert('成功', `数据已导出到: ${fileUri}`);
      }
      setShowDataModal(false);
    } catch (error: unknown) {
      console.error('导出失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      Alert.alert('错误', errorMessage);
    }
  };

  // 导出日期范围明细 CSV
  const handleExportDateRangeCSV = async () => {
    try {
      const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      const csvData = await exportDateRangeCSV(rangeStart, rangeEnd);

      const fileName = `工时明细_${formatDate(startDate)}_${formatDate(endDate)}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, csvData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: '导出CSV',
        });
      } else {
        Alert.alert('成功', `数据已导出到: ${fileUri}`);
      }
      setShowDataModal(false);
    } catch (error: unknown) {
      console.error('导出失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      Alert.alert('错误', errorMessage);
    }
  };

  // 导出项目汇总 CSV
  const handleExportProjectCSV = async () => {
    try {
      const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      const csvData = await exportProjectSummaryByDateRange(rangeStart, rangeEnd);

      const fileName = `项目汇总_${formatDate(startDate)}_${formatDate(endDate)}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, csvData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: '导出CSV',
        });
      } else {
        Alert.alert('成功', `数据已导出到: ${fileUri}`);
      }
      setShowDataModal(false);
    } catch (error: unknown) {
      console.error('导出失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      Alert.alert('错误', errorMessage);
    }
  };

  // 导出人员汇总 CSV
  const handleExportWorkerCSV = async () => {
    try {
      const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      const csvData = await exportWorkerSummaryByDateRange(rangeStart, rangeEnd);

      const fileName = `人员汇总_${formatDate(startDate)}_${formatDate(endDate)}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, csvData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: '导出CSV',
        });
      } else {
        Alert.alert('成功', `数据已导出到: ${fileUri}`);
      }
      setShowDataModal(false);
    } catch (error: unknown) {
      console.error('导出失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      Alert.alert('错误', errorMessage);
    }
  };

  // 从 JSON 文件导入数据
  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const jsonData = await (FileSystem as any).readAsStringAsync(fileUri);

      const importResult = await importAllData(jsonData);

      Alert.alert(
        '导入成功',
        `新增数据：\n- 项目：${importResult.projectsCount} 个\n- 人员：${importResult.workersCount} 个\n- 工时记录：${importResult.workLogsCount} 条\n\n重复数据已自动跳过`,
        [
          {
            text: '确定',
            onPress: () => {
              setShowDataModal(false);
              fetchStats();
            }
          }
        ]
      );
    } catch (error: unknown) {
      console.error('导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      Alert.alert('错误', errorMessage);
    }
  };

  const currentStats = statsMode === 'worker' ? workerStats : projectStats;
  const totalHours = currentStats.reduce((sum, item) => sum + item.totalHours, 0);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Tab 切换栏 - 横向大按钮 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, statsMode === 'worker' && styles.tabButtonActive]}
            onPress={() => setStatsMode('worker')}
          >
            <ThemedText
              variant="bodyMedium"
              color={statsMode === 'worker' ? theme.buttonPrimaryText : theme.textSecondary}
            >
              按人员统计
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, statsMode === 'project' && styles.tabButtonActive]}
            onPress={() => setStatsMode('project')}
          >
            <ThemedText
              variant="bodyMedium"
              color={statsMode === 'project' ? theme.buttonPrimaryText : theme.textSecondary}
            >
              按项目统计
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* 日期范围选择区域 */}
        <View style={styles.dateRangeRow}>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartPicker(true)}
          >
            <FontAwesome6 name="calendar" size={14} color={theme.textMuted} />
            <ThemedText variant="small" color={theme.textPrimary} style={{ marginLeft: 6 }}>
              {formatDate(startDate)}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText variant="small" color={theme.textMuted} style={{ marginHorizontal: 8 }}>
            至
          </ThemedText>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndPicker(true)}
          >
            <FontAwesome6 name="calendar" size={14} color={theme.textMuted} />
            <ThemedText variant="small" color={theme.textPrimary} style={{ marginLeft: 6 }}>
              {formatDate(endDate)}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDataModal(true)} style={styles.iconButtonSmall}>
            <FontAwesome6 name="database" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 统计数据区 */}
        <ScrollView style={styles.list}>
          {currentStats.length === 0 ? (
            <ThemedView level="default" style={styles.emptyState}>
              <FontAwesome6 name="chart-simple" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={{ marginTop: 16 }}>
                暂无数据
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {/* 总计卡片 */}
              <ThemedView level="default" style={styles.totalCard}>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {statsMode === 'worker' ? '人员总计' : '项目总计'}
                </ThemedText>
                <View style={styles.totalValueRow}>
                  <ThemedText variant="displayMedium" color={theme.primary}>
                    {totalHours.toFixed(2)}
                  </ThemedText>
                  <ThemedText variant="h3" color={theme.textMuted}>
                    工作日
                  </ThemedText>
                </View>
              </ThemedView>

              {/* 列表 */}
              {statsMode === 'worker' ? (
                workerStats.map(item => (
                  <ThemedView key={item.workerId} level="default" style={styles.statsGroup}>
                    <TouchableOpacity
                      style={styles.statsHeader}
                      onPress={() => toggleExpand(item.workerId)}
                    >
                      <View style={styles.statsHeaderLeft}>
                        <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                          {item.workerName}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          共 {item.records.length} 条记录
                        </ThemedText>
                      </View>
                      <View style={styles.statsHeaderRight}>
                        <ThemedText variant="h2" color={theme.primary}>
                          {item.totalHours.toFixed(2)} 天
                        </ThemedText>
                        <FontAwesome6
                          name={expandedItems.has(item.workerId) ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.textMuted}
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedItems.has(item.workerId) && (
                      <View style={styles.statsDetails}>
                        {item.records.map((record, index) => (
                          <View key={`${record.date}-${index}`} style={styles.recordItem}>
                            <View style={styles.recordLeft}>
                              <ThemedText variant="caption" color={theme.textMuted}>
                                {record.date}
                              </ThemedText>
                              <ThemedText variant="small" color={theme.textPrimary}>
                                {record.projectName}
                              </ThemedText>
                              <ThemedText variant="small" color={theme.textSecondary} style={styles.recordDesc}>
                                {record.description}
                              </ThemedText>
                            </View>
                            <ThemedText variant="bodyMedium" color={theme.primary}>
                              {record.hours} 天
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </ThemedView>
                ))
              ) : (
                projectStats.map(item => (
                  <ThemedView key={item.projectId} level="default" style={styles.statsGroup}>
                    <TouchableOpacity
                      style={styles.statsHeader}
                      onPress={() => toggleExpand(item.projectId)}
                    >
                      <View style={styles.statsHeaderLeft}>
                        <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                          {item.projectName}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          共 {item.records.length} 条记录
                        </ThemedText>
                      </View>
                      <View style={styles.statsHeaderRight}>
                        <ThemedText variant="h2" color={theme.primary}>
                          {item.totalHours.toFixed(2)} 天
                        </ThemedText>
                        <FontAwesome6
                          name={expandedItems.has(item.projectId) ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.textMuted}
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedItems.has(item.projectId) && (
                      <View style={styles.statsDetails}>
                        {item.records.map((record, index) => (
                          <View key={`${record.date}-${index}`} style={styles.recordItem}>
                            <View style={styles.recordLeft}>
                              <ThemedText variant="caption" color={theme.textMuted}>
                                {record.date}
                              </ThemedText>
                              <ThemedText variant="small" color={theme.textPrimary}>
                                {record.workerName}
                              </ThemedText>
                              <ThemedText variant="small" color={theme.textSecondary} style={styles.recordDesc}>
                                {record.description}
                              </ThemedText>
                            </View>
                            <ThemedText variant="bodyMedium" color={theme.primary}>
                              {record.hours} 天
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </ThemedView>
                ))
              )}
            </>
          )}
        </ScrollView>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, date) => handleStartDateChange(date)}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, date) => handleEndDateChange(date)}
          />
        )}

        {/* 数据管理 Modal */}
        <Modal visible={showDataModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowDataModal(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  数据管理
                </ThemedText>
                <TouchableOpacity onPress={() => setShowDataModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {/* CSV 导出区域 */}
                <ThemedText variant="caption" color={theme.textMuted} style={{ marginBottom: 8 }}>
                  导出Excel (CSV格式)
                </ThemedText>
                
                <TouchableOpacity style={styles.dataAction} onPress={handleExportDateRangeCSV}>
                  <FontAwesome6 name="table" size={24} color={theme.primary} />
                  <View style={styles.dataActionText}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      导出明细
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      按日期列出所有工时记录
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dataAction} onPress={handleExportProjectCSV}>
                  <FontAwesome6 name="folder" size={24} color={theme.primary} />
                  <View style={styles.dataActionText}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      导出项目汇总
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      按项目统计工时数据
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dataAction} onPress={handleExportWorkerCSV}>
                  <FontAwesome6 name="user" size={24} color={theme.primary} />
                  <View style={styles.dataActionText}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      导出人员汇总
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      按人员统计工时数据
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                {/* 分隔线 */}
                <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 16 }} />

                {/* JSON 导入导出 */}
                <ThemedText variant="caption" color={theme.textMuted} style={{ marginBottom: 8 }}>
                  数据备份与恢复
                </ThemedText>

                <TouchableOpacity style={styles.dataAction} onPress={handleExportData}>
                  <FontAwesome6 name="file-export" size={24} color={theme.primary} />
                  <View style={styles.dataActionText}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      导出备份
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      将所有数据导出为 JSON 文件
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dataAction} onPress={handleImportData}>
                  <FontAwesome6 name="file-import" size={24} color={theme.primary} />
                  <View style={styles.dataActionText}>
                    <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                      导入备份
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      增量合并，不覆盖现有数据
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
