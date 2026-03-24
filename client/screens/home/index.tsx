import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { createStyles } from './styles';
import {
  projectService,
  workerService,
  workLogService,
  templateService,
  checkAndAutoBackup,
  type WorkTemplate,
} from '@/services/LocalStorage';

interface Project {
  id: number;
  name: string;
}

interface Worker {
  id: number;
  name: string;
}

interface WorkLog {
  id: number;
  projectId: number;
  projectName: string;
  date: string;
  description: string;
  workers: Array<{ id: number; name: string; hours: number }>;
  createdAt: string;
}

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const backupCalledRef = useRef(false);

  // 表单状态
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<Map<number, number>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);

  // 数据状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal 状态
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // 批量记录状态
  const [batchMode, setBatchMode] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [skipWeekend, setSkipWeekend] = useState(true);

  // 编辑表单状态
  const [editProject, setEditProject] = useState<number | null>(null);
  const [editWorkers, setEditWorkers] = useState<Map<number, number>>(new Map());
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editDescription, setEditDescription] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      const [projectData, workerData, workLogData, templateData] = await Promise.all([
        projectService.getAll(),
        workerService.getAll(),
        workLogService.getAll(),
        templateService.getAll(),
      ]);
      setProjects(projectData);
      setWorkers(workerData);
      setWorkLogs(workLogData);
      setTemplates(templateData);

      // 首次加载后执行自动备份（不阻塞UI）
      if (!backupCalledRef.current) {
        backupCalledRef.current = true;
        checkAndAutoBackup().catch(() => {
          // 自动备份失败，静默处理
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('错误', '加载数据失败');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 选择项目
  const handleSelectProject = (projectId: number) => {
    setSelectedProject(projectId);
    setShowProjectModal(false);
  };

  // 清空表单
  const handleClearForm = useCallback(() => {
    setSelectedProject(null);
    setSelectedWorkers(new Map());
    setSelectedDate(new Date());
    setDescription('');
    setBatchMode(false);
    setStartDate(new Date());
    setEndDate(new Date());
  }, []);

  // 切换人员选择
  const toggleWorker = useCallback((workerId: number) => {
    setSelectedWorkers(prev => {
      const newSelected = new Map(prev);
      if (newSelected.has(workerId)) {
        newSelected.delete(workerId);
      } else {
        newSelected.set(workerId, 1);
      }
      return newSelected;
    });
  }, []);

  // 切换工时数量（1天 -> 0.5天 -> 0天 -> 1天 循环）
  const toggleWorkerHours = useCallback((workerId: number) => {
    setSelectedWorkers(prev => {
      const newSelected = new Map(prev);
      const currentHours = newSelected.get(workerId) ?? 1;
      // 循环切换：1 -> 0.5 -> 0 -> 1
      if (currentHours === 1) {
        newSelected.set(workerId, 0.5);
      } else if (currentHours === 0.5) {
        newSelected.set(workerId, 0);
      } else {
        newSelected.set(workerId, 1);
      }
      return newSelected;
    });
  }, []);

  // 提交工时记录
  const handleSubmit = useCallback(async () => {
    if (!selectedProject) {
      Alert.alert('提示', '请选择项目');
      return;
    }

    if (selectedWorkers.size === 0) {
      Alert.alert('提示', '请至少选择一个人员');
      return;
    }

    // 检查是否有工时大于0的人员
    const workersWithHours = Array.from(selectedWorkers.entries()).filter(([, hours]) => hours > 0);
    if (workersWithHours.length === 0) {
      Alert.alert('提示', '请至少选择一个工时大于0的人员');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请填写工作内容');
      return;
    }

    setLoading(true);

    try {
      const project = await projectService.getById(selectedProject);
      if (!project) {
        Alert.alert('错误', '项目不存在');
        setLoading(false);
        return;
      }

      const workersArray = Array.from(selectedWorkers.entries())
        .filter(([, hours]) => hours > 0)
        .map(([id, hours]) => ({
          id,
          name: workers.find(w => w.id === id)?.name || '未知人员',
          hours,
        }));

      if (batchMode) {
        // 批量记录模式
        const dates: string[] = [];
        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (!skipWeekend || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
            dates.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
        }

        if (dates.length === 0) {
          Alert.alert('提示', '选择的日期范围内没有工作日');
          setLoading(false);
          return;
        }

        for (const date of dates) {
          await workLogService.create({
            projectId: selectedProject,
            projectName: project.name,
            date,
            description: description.trim(),
            workers: workersArray,
          });
        }

        Alert.alert('成功', `已批量添加 ${dates.length} 条工时记录`);
      } else {
        // 单条记录模式
        await workLogService.create({
          projectId: selectedProject,
          projectName: project.name,
          date: selectedDate.toISOString().split('T')[0],
          description: description.trim(),
          workers: workersArray,
        });

        Alert.alert('成功', '工时记录已添加');
      }

      handleClearForm();
      fetchData();
    } catch (error: any) {
      console.error('提交失败:', error);
      Alert.alert('错误', error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  }, [
    selectedProject,
    selectedWorkers,
    selectedDate,
    description,
    batchMode,
    startDate,
    endDate,
    skipWeekend,
    handleClearForm,
    fetchData,
    workers,
  ]);

  // 应用模板
  const handleApplyTemplate = useCallback((template: WorkTemplate) => {
    setSelectedProject(template.projectId);
    setSelectedWorkers(new Map(template.workers.map(w => [w.id, w.hours])));
    setDescription(template.description);
    setShowTemplateModal(false);
  }, []);

  // 保存为模板
  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      Alert.alert('提示', '请输入模板名称');
      return;
    }

    if (!selectedProject) {
      Alert.alert('提示', '请选择项目');
      return;
    }

    if (selectedWorkers.size === 0) {
      Alert.alert('提示', '请至少选择一个人员');
      return;
    }

    try {
      const project = await projectService.getById(selectedProject);
      if (!project) {
        Alert.alert('错误', '项目不存在');
        return;
      }

      const workersArray = Array.from(selectedWorkers.entries()).map(([id, hours]) => ({
        id,
        name: workers.find(w => w.id === id)?.name || '未知人员',
        hours,
      }));

      await templateService.create({
        name: templateName.trim(),
        projectId: selectedProject,
        projectName: project.name,
        workers: workersArray,
        description: description.trim(),
      });

      Alert.alert('成功', '模板已保存');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      fetchData();
    } catch (error: any) {
      console.error('保存模板失败:', error);
      Alert.alert('错误', error.message || '保存模板失败');
    }
  }, [templateName, selectedProject, selectedWorkers, description, workers, fetchData]);

  // 删除模板
  const handleDeleteTemplate = useCallback(async (id: number) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个模板吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await templateService.delete(id);
              Alert.alert('成功', '模板已删除');
              fetchData();
            } catch (error: any) {
              console.error('删除模板失败:', error);
              Alert.alert('错误', error.message || '删除模板失败');
            }
          },
        },
      ]
    );
  }, [fetchData]);

  // 编辑工时记录
  const handleEditWorkLog = useCallback((workLog: WorkLog) => {
    setEditingWorkLog(workLog);
    setEditProject(workLog.projectId);
    setEditWorkers(new Map(workLog.workers.map(w => [w.id, w.hours])));
    setEditDate(new Date(workLog.date));
    setEditDescription(workLog.description);
    setShowEditModal(true);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editProject || !editingWorkLog) return;

    // 检查是否有工时大于0的人员
    const editWorkersWithHours = Array.from(editWorkers.entries()).filter(([, hours]) => hours > 0);
    if (editWorkersWithHours.length === 0) {
      Alert.alert('提示', '请至少选择一个工时大于0的人员');
      return;
    }

    if (!editDescription.trim()) {
      Alert.alert('提示', '请填写工作内容');
      return;
    }

    setLoading(true);

    try {
      const project = await projectService.getById(editProject);
      if (!project) {
        Alert.alert('错误', '项目不存在');
        setLoading(false);
        return;
      }

      const workersArray = Array.from(editWorkers.entries())
        .filter(([, hours]) => hours > 0)
        .map(([id, hours]) => ({
          id,
          name: workers.find(w => w.id === id)?.name || '未知人员',
          hours,
        }));

      await workLogService.update(editingWorkLog.id, {
        projectId: editProject,
        projectName: project.name,
        date: editDate.toISOString().split('T')[0],
        description: editDescription.trim(),
        workers: workersArray,
      });

      Alert.alert('成功', '工时记录已更新');
      setShowEditModal(false);
      setEditingWorkLog(null);
      fetchData();
    } catch (error: any) {
      console.error('保存失败:', error);
      Alert.alert('错误', error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  }, [editProject, editWorkers, editDate, editDescription, editingWorkLog, fetchData, workers]);

  const toggleEditWorker = useCallback((workerId: number) => {
    setEditWorkers(prev => {
      const newSelected = new Map(prev);
      if (newSelected.has(workerId)) {
        newSelected.delete(workerId);
      } else {
        newSelected.set(workerId, 1);
      }
      return newSelected;
    });
  }, []);

  const toggleEditWorkerHours = useCallback((workerId: number) => {
    setEditWorkers(prev => {
      const newSelected = new Map(prev);
      const currentHours = newSelected.get(workerId) ?? 1;
      // 循环切换：1 -> 0.5 -> 0 -> 1
      if (currentHours === 1) {
        newSelected.set(workerId, 0.5);
      } else if (currentHours === 0.5) {
        newSelected.set(workerId, 0);
      } else {
        newSelected.set(workerId, 1);
      }
      return newSelected;
    });
  }, []);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* 表单区域 */}
          <ThemedView level="default" style={styles.formCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                记录工时
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={() => setShowTemplateModal(true)}
                >
                  <FontAwesome6 name="bookmark" size={14} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.primary}>模板</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={() => setShowSaveTemplateModal(true)}
                >
                  <FontAwesome6 name="floppy-disk" size={14} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.primary}>存模板</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 批量模式开关 */}
            <View style={styles.batchModeContainer}>
              <TouchableOpacity
                style={styles.batchModeSwitch}
                onPress={() => setBatchMode(!batchMode)}
              >
                <FontAwesome6
                  name={batchMode ? 'toggle-on' : 'toggle-off'}
                  size={24}
                  color={batchMode ? theme.primary : theme.textMuted}
                />
                <ThemedText variant="body" color={batchMode ? theme.primary : theme.textSecondary}>
                  批量记录
                </ThemedText>
              </TouchableOpacity>
              {batchMode && (
                <View style={styles.skipWeekendContainer}>
                  <ThemedText variant="caption" color={theme.textMuted}>跳过周末</ThemedText>
                  <Switch
                    value={skipWeekend}
                    onValueChange={setSkipWeekend}
                    trackColor={{ false: theme.border, true: theme.primary }}
                  />
                </View>
              )}
            </View>

            {/* 项目选择 */}
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowProjectModal(true)}
            >
              <ThemedText variant="body" color={theme.textPrimary}>
                {selectedProject
                  ? projects.find(p => p.id === selectedProject)?.name
                  : '选择项目'}
              </ThemedText>
              <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 人员选择 */}
            <View style={styles.workerSelectorContainer}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                选择人员（点击切换工时）
              </ThemedText>
              <View style={styles.workersGrid}>
                {workers.map(worker => {
                  const isSelected = selectedWorkers.has(worker.id);
                  const hours = selectedWorkers.get(worker.id) ?? 0;
                  const hasHours = hours > 0;
                  return (
                    <TouchableOpacity
                      key={worker.id}
                      style={[
                        styles.workerChip,
                        isSelected && hasHours && styles.workerChipSelected,
                        isSelected && !hasHours && styles.workerChipZero,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          toggleWorkerHours(worker.id);
                        } else {
                          toggleWorker(worker.id);
                        }
                      }}
                    >
                      <ThemedText
                        variant="caption"
                        color={isSelected && hasHours ? theme.buttonPrimaryText : theme.textPrimary}
                      >
                        {worker.name}
                      </ThemedText>
                      {isSelected && (
                        <ThemedText
                          variant="caption"
                          color={isSelected && hasHours ? theme.buttonPrimaryText : theme.textMuted}
                          style={{ marginLeft: 4 }}
                        >
                          ({hours}天)
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 日期选择 */}
            {batchMode ? (
              <View style={styles.dateRangeContainer}>
                <TouchableOpacity
                  style={styles.dateRangeInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <FontAwesome6 name="calendar" size={16} color={theme.textMuted} />
                  <ThemedText variant="small" color={theme.textPrimary}>
                    {startDate.toLocaleDateString('zh-CN')}
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText variant="body" color={theme.textMuted}>至</ThemedText>
                <TouchableOpacity
                  style={styles.dateRangeInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <FontAwesome6 name="calendar" size={16} color={theme.textMuted} />
                  <ThemedText variant="small" color={theme.textPrimary}>
                    {endDate.toLocaleDateString('zh-CN')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <FontAwesome6 name="calendar" size={20} color={theme.textPrimary} />
                <ThemedText variant="body" color={theme.textPrimary}>
                  {selectedDate.toLocaleDateString('zh-CN')}
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* 工作内容 */}
            <View style={styles.descriptionContainer}>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                工作内容
              </ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.textPrimary }]}
                placeholder="今天做了什么事情？"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* 按钮组 */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearForm}
                disabled={loading}
              >
                <ThemedText variant="bodyMedium" color={theme.textMuted}>
                  清空
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <ThemedText
                  variant="bodyMedium"
                  color={loading ? theme.textMuted : theme.buttonPrimaryText}
                >
                  {loading ? '提交中...' : batchMode ? '批量提交' : '提交'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* 工时记录列表 */}
          <ThemedView level="root" style={styles.listContainer}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
              最近记录
            </ThemedText>
            {workLogs.length === 0 ? (
              <ThemedView level="default" style={styles.emptyState}>
                <ThemedText variant="caption" color={theme.textMuted}>
                  暂无工时记录
                </ThemedText>
              </ThemedView>
            ) : (
              workLogs.slice(-20).reverse().map(workLog => (
                <ThemedView key={workLog.id} level="default" style={styles.workLogCard}>
                  <View style={styles.workLogHeader}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary}>
                      {workLog.projectName}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {workLog.date}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.workLogDesc}>
                    {workLog.description}
                  </ThemedText>
                  <View style={styles.workLogFooter}>
                    <View style={styles.workersTags}>
                      {workLog.workers.map(worker => (
                        <View key={worker.id} style={styles.workerTag}>
                          <ThemedText variant="caption" color={theme.textSecondary}>
                            {worker.name} ({worker.hours}天)
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => handleEditWorkLog(workLog)}>
                      <FontAwesome6 name="pen" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ))
            )}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 日期选择器 */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
      {showEditDatePicker && (
        <DateTimePicker
          value={editDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEditDatePicker(false);
            if (date) setEditDate(date);
          }}
        />
      )}

      {/* 项目选择 Modal */}
      <Modal visible={showProjectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>选择项目</ThemedText>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {projects.length === 0 ? (
                <ThemedView level="default" style={styles.emptyState}>
                  <ThemedText variant="caption" color={theme.textMuted}>
                    暂无项目，请先添加项目
                  </ThemedText>
                </ThemedView>
              ) : (
                projects.map(project => (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.projectItem,
                      selectedProject === project.id && styles.projectItemSelected,
                    ]}
                    onPress={() => handleSelectProject(project.id)}
                  >
                    <ThemedText
                      variant="body"
                      color={selectedProject === project.id ? theme.buttonPrimaryText : theme.textPrimary}
                    >
                      {project.name}
                    </ThemedText>
                    {selectedProject === project.id && (
                      <FontAwesome6 name="check" size={16} color={theme.buttonPrimaryText} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* 模板选择 Modal */}
      <Modal visible={showTemplateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>选择模板</ThemedText>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {templates.length === 0 ? (
                <ThemedView level="default" style={styles.emptyState}>
                  <FontAwesome6 name="bookmark" size={40} color={theme.textMuted} />
                  <ThemedText variant="caption" color={theme.textMuted} style={{ marginTop: 12 }}>
                    暂无模板，请先保存模板
                  </ThemedText>
                </ThemedView>
              ) : (
                templates.map(template => (
                  <View key={template.id} style={styles.templateItem}>
                    <TouchableOpacity
                      style={styles.templateItemInfo}
                      onPress={() => handleApplyTemplate(template)}
                    >
                      <ThemedText variant="bodyMedium" color={theme.textPrimary}>
                        {template.name}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        {template.projectName} · {template.workers.length}人
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateActionIcon}
                      onPress={() => handleDeleteTemplate(template.id)}
                    >
                      <FontAwesome6 name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* 保存模板 Modal */}
      <Modal visible={showSaveTemplateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>保存为模板</ThemedText>
              <TouchableOpacity onPress={() => setShowSaveTemplateModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.descriptionContainer}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  模板名称
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary, minHeight: 50 }]}
                  placeholder="输入模板名称"
                  placeholderTextColor={theme.textMuted}
                  value={templateName}
                  onChangeText={setTemplateName}
                />
              </View>
              <TouchableOpacity
                style={[styles.submitButton, { marginTop: 16 }]}
                onPress={handleSaveTemplate}
              >
                <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
                  保存模板
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* 编辑 Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>编辑工时记录</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.editFormSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  项目
                </ThemedText>
                <ScrollView style={styles.editProjectList} nestedScrollEnabled>
                  {projects.map(project => (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.editProjectItem,
                        editProject === project.id && styles.editProjectItemSelected,
                      ]}
                      onPress={() => setEditProject(project.id)}
                    >
                      <ThemedText
                        variant="body"
                        color={editProject === project.id ? theme.buttonPrimaryText : theme.textPrimary}
                      >
                        {project.name}
                      </ThemedText>
                      {editProject === project.id && (
                        <FontAwesome6 name="check" size={16} color={theme.buttonPrimaryText} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.editFormSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  人员（点击切换工时）
                </ThemedText>
                <View style={styles.editWorkersGrid}>
                  {workers.map(worker => {
                    const isSelected = editWorkers.has(worker.id);
                    const hours = editWorkers.get(worker.id) ?? 0;
                    const hasHours = hours > 0;
                    return (
                      <TouchableOpacity
                        key={worker.id}
                        style={[
                          styles.workerChip,
                          isSelected && hasHours && styles.workerChipSelected,
                          isSelected && !hasHours && styles.workerChipZero,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            toggleEditWorkerHours(worker.id);
                          } else {
                            toggleEditWorker(worker.id);
                          }
                        }}
                      >
                        <ThemedText
                          variant="caption"
                          color={isSelected && hasHours ? theme.buttonPrimaryText : theme.textPrimary}
                        >
                          {worker.name}
                        </ThemedText>
                        {isSelected && (
                          <ThemedText
                            variant="caption"
                            color={isSelected && hasHours ? theme.buttonPrimaryText : theme.textMuted}
                            style={{ marginLeft: 4 }}
                          >
                            ({hours}天)
                          </ThemedText>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editFormSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  日期
                </ThemedText>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setShowEditDatePicker(true)}
                >
                  <FontAwesome6 name="calendar" size={20} color={theme.textPrimary} />
                  <ThemedText variant="body" color={theme.textPrimary}>
                    {editDate.toLocaleDateString('zh-CN')}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.editFormSection}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  工作内容
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  placeholder="工作内容"
                  placeholderTextColor={theme.textMuted}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveButton, loading && styles.submitButtonDisabled]}
              onPress={handleSaveEdit}
              disabled={loading}
            >
              <ThemedText variant="bodyMedium" color={loading ? theme.textMuted : theme.buttonPrimaryText}>
                {loading ? '保存中...' : '保存'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </Screen>
  );
}
