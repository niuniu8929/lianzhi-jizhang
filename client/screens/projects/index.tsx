import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Project, DeliveryRecord } from '@/types';
import { ProjectStorage, DeliveryRecordStorage } from '@/utils/storage';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { ProjectStatusNames, ProjectTypeNames, InvoiceStatusNames } from '@/types';

// 送货记录卡片组件
const DeliveryRecordItem = ({ 
  record, 
  index, 
  totalRecords, 
  theme, 
  onEdit,
  onViewImage 
}: { 
  record: DeliveryRecord; 
  index: number; 
  totalRecords: number; 
  theme: any;
  onEdit: (record: DeliveryRecord) => void;
  onViewImage: (imageUrl: string) => void;
}) => {
  return (
    <TouchableOpacity 
      style={{
        backgroundColor: theme.backgroundTertiary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
      }}
      onPress={() => onEdit(record)}
      activeOpacity={0.7}
    >
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
              <ThemedText variant="caption" color={theme.accent}>第 {totalRecords - index} 次</ThemedText>
            </View>
            <ThemedText variant="caption" color={theme.textMuted}>
              {formatDate(record.date)}
            </ThemedText>
          </View>
          <ThemedText variant="body" color={theme.textPrimary} numberOfLines={2}>
            {record.description}
          </ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
          {/* 编辑按钮 */}
          <TouchableOpacity 
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.primary + '15',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
          >
            <FontAwesome6 name="pen-to-square" size={14} color={theme.primary} />
          </TouchableOpacity>
          {record.amount > 0 ? (
            <ThemedText variant="h4" color={theme.primary}>{formatCurrency(record.amount)}</ThemedText>
          ) : (
            <ThemedText variant="body" color={theme.textMuted}>-</ThemedText>
          )}
          {record.invoiceStatus !== 'none' && (
            <View style={{
              backgroundColor: record.invoiceStatus === 'completed' ? theme.success + '20' : theme.accent + '20',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginTop: 4,
            }}>
              <ThemedText variant="caption" color={record.invoiceStatus === 'completed' ? theme.success : theme.accent}>
                {record.invoiceStatus === 'completed' ? '已开票' : '部分开票'}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      
      {/* 图片缩略图 */}
      {record.images.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: 4 }}>
          {record.images.slice(0, 4).map((imageUrl, imgIndex) => (
            <TouchableOpacity
              key={imgIndex}
              onPress={(e) => {
                e.stopPropagation();
                onViewImage(imageUrl);
              }}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: imageUrl }} 
                style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: BorderRadius.sm,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
          {record.images.length > 4 && (
            <View style={{ 
              width: 60, 
              height: 60, 
              borderRadius: BorderRadius.sm,
              backgroundColor: theme.backgroundDefault,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <ThemedText variant="caption" color={theme.textMuted}>+{record.images.length - 4}</ThemedText>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ProjectsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliveryRecordsMap, setDeliveryRecordsMap] = useState<Record<string, DeliveryRecord[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Tab 切换状态：'contract' = 工程项目，'delivery' = 零星采购
  const [activeTab, setActiveTab] = useState<'contract' | 'delivery'>('contract');
  
  // 图片预览状态
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // 查看图片
  const handleViewImage = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewVisible(true);
  }, []);

  // 编辑送货记录
  const handleEditDeliveryRecord = useCallback((record: DeliveryRecord) => {
    console.log('编辑送货记录被点击:', record.id, record.description);
    router.push('/delivery-edit', { id: record.id });
  }, [router]);

  const loadProjects = useCallback(async () => {
    const data = await ProjectStorage.getAll();
    // 只显示进行中和已暂停的项目，已完成的项目只在统计页面显示
    const activeProjects = data.filter(p => p.status !== 'completed');
    setProjects(activeProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    
    // 加载所有送货项目的送货记录
    const deliveryProjects = activeProjects.filter(p => p.projectType === 'delivery');
    const recordsMap: Record<string, DeliveryRecord[]> = {};
    for (const project of deliveryProjects) {
      const records = await DeliveryRecordStorage.getByProjectId(project.id);
      recordsMap[project.id] = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setDeliveryRecordsMap(recordsMap);
  }, []);

  // 切换项目展开状态
  const toggleProjectExpand = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  // 计算送货项目的累计金额
  const getDeliveryTotalAmount = useCallback((projectId: string) => {
    const records = deliveryRecordsMap[projectId] || [];
    return records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [deliveryRecordsMap]);

  // 计算送货项目的已开票金额
  const getDeliveryInvoicedAmount = useCallback((projectId: string) => {
    const records = deliveryRecordsMap[projectId] || [];
    return records.reduce((sum, r) => sum + (Number(r.invoiceAmount) || 0), 0);
  }, [deliveryRecordsMap]);

  // 计算送货项目的已收款金额
  const getDeliveryReceivedAmount = useCallback((projectId: string) => {
    const records = deliveryRecordsMap[projectId] || [];
    return records.reduce((sum, r) => sum + (Number(r.receivedAmount) || 0), 0);
  }, [deliveryRecordsMap]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  // 根据选中的 Tab 过滤项目
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (activeTab === 'contract') {
        return p.projectType === 'contract' || !p.projectType;
      }
      return p.projectType === 'delivery';
    });
  }, [projects, activeTab]);

  // 统计各类型项目数量
  const projectCounts = useMemo(() => {
    const contractCount = projects.filter(p => p.projectType === 'contract' || !p.projectType).length;
    const deliveryCount = projects.filter(p => p.projectType === 'delivery').length;
    return { contractCount, deliveryCount };
  }, [projects]);

  const handleAddProject = () => {
    router.push('/projects/add');
  };

  const handleEditProject = (project: Project) => {
    console.log('编辑项目被点击:', project.id, project.name);
    console.log('准备跳转到编辑页面，参数 id:', project.id);
    router.push('/projects/edit', { id: project.id });
    console.log('路由跳转已调用');
  };

  // 获取项目总金额（合同项目用合同金额，送货项目用送货总额）
  const getProjectTotalAmount = (project: Project) => {
    if (project.projectType === 'delivery') {
      return project.deliveryAmount ?? 0;
    }
    return project.contractAmount ?? 0;
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const isExpanded = expandedProjects.has(item.id);
    const deliveryRecords = deliveryRecordsMap[item.id] || [];
    const totalDeliveryAmount = getDeliveryTotalAmount(item.id);
    const totalInvoicedAmount = getDeliveryInvoicedAmount(item.id);
    const totalReceivedAmount = getDeliveryReceivedAmount(item.id);
    
    return (
      <View style={styles.projectCard}>
        {/* 项目头部 */}
        <View style={styles.projectHeader}>
          <TouchableOpacity
            style={styles.projectTitleContainer}
            onPress={() => {
              if (item.projectType === 'delivery') {
                toggleProjectExpand(item.id);
              } else {
                router.push('/projects/detail', { id: item.id });
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.projectName}>
              {item.name}
            </ThemedText>
            {/* 送货项目显示展开/收起箭头 */}
            {item.projectType === 'delivery' && deliveryRecords.length > 0 && (
              <FontAwesome6 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={12} 
                color={theme.textMuted} 
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
          <View style={styles.projectHeaderRight}>
            {/* 项目类型标识 */}
            <View style={[styles.typeBadge, { backgroundColor: item.projectType === 'delivery' ? '#E53935' : theme.primary }]}>
              <ThemedText variant="caption" color="#FFFFFF" style={styles.typeBadgeText}>
                {item.projectType === 'delivery' ? '采购' : '工程'}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('编辑按钮被点击:', item.id, item.name);
                handleEditProject(item);
              }}
              style={styles.editButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <FontAwesome6 name="pen-to-square" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 送货项目 - 展开显示送货记录列表 */}
        {item.projectType === 'delivery' ? (
          <>
            {/* 送货统计汇总 */}
            <TouchableOpacity
              onPress={() => toggleProjectExpand(item.id)}
              activeOpacity={0.7}
              style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <ThemedText variant="caption" color={theme.textMuted}>送货次数：</ThemedText>
                    <ThemedText variant="body" color={theme.accent} style={{ fontWeight: '600' }}>
                      {deliveryRecords.length} 次
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted} style={{ marginLeft: 16 }}>图片：</ThemedText>
                    <ThemedText variant="body" color={theme.primary}>
                      {deliveryRecords.reduce((sum, r) => sum + r.images.length, 0)} 张
                    </ThemedText>
                  </View>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color={theme.textMuted}>累计金额</ThemedText>
                  <ThemedText variant="h3" color={theme.primary}>
                    {formatCurrency(totalDeliveryAmount)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color={theme.textMuted}>已开票</ThemedText>
                  <ThemedText variant="h3" color={theme.success}>
                    {formatCurrency(totalInvoicedAmount)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color={theme.textMuted}>已收款</ThemedText>
                  <ThemedText variant="h3" color={theme.accent}>
                    {formatCurrency(totalReceivedAmount)}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            {/* 展开的送货记录列表 */}
            {isExpanded && deliveryRecords.length > 0 && (
              <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
                <View style={{ height: 1, backgroundColor: theme.border, marginBottom: Spacing.md }} />
                {deliveryRecords.map((record, index) => (
                  <DeliveryRecordItem 
                    key={record.id} 
                    record={record} 
                    index={index} 
                    totalRecords={deliveryRecords.length}
                    theme={theme}
                    onEdit={handleEditDeliveryRecord}
                    onViewImage={handleViewImage}
                  />
                ))}
              </View>
            )}

            {/* 添加送货记录按钮 */}
            <TouchableOpacity 
              style={[styles.quickAddButton, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}
              onPress={() => router.push('/delivery-add', { projectId: item.id })}
            >
              <FontAwesome6 name="plus" size={14} color={theme.accent} style={{ marginRight: 6 }} />
              <ThemedText variant="caption" color={theme.accent}>添加送货记录</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          /* 合同项目 - 简洁显示 */
          <TouchableOpacity
            onPress={() => router.push('/projects/detail', { id: item.id })}
            activeOpacity={0.7}
            style={styles.projectBody}
          >
            <View style={styles.projectInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <ThemedText variant="caption" color={theme.textMuted}>负责人</ThemedText>
                  <ThemedText variant="body" color={theme.textPrimary} style={styles.infoValue}>
                    {item.manager || '-'}
                  </ThemedText>
                </View>
                <View style={styles.infoItem}>
                  <ThemedText variant="caption" color={theme.textMuted}>工程竣工日期</ThemedText>
                  <ThemedText variant="body" color={item.endDate && isOverdue(item.endDate) ? theme.error : theme.textPrimary} style={styles.infoValue}>
                    {item.endDate ? formatDate(item.endDate) : '-'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.success;
      case 'completed': return theme.primary;
      case 'paused': return theme.textMuted;
      default: return theme.textMuted;
    }
  };

  const isOverdue = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome6 name="folder-open" size={64} color={theme.textMuted} style={styles.emptyIcon} />
      <ThemedText variant="h4" color={theme.textSecondary} style={styles.emptyText}>
        暂无{activeTab === 'contract' ? '工程项目' : '零星采购'}
      </ThemedText>
      <ThemedText variant="body" color={theme.textMuted} style={styles.emptyHint}>
        点击右下角按钮创建第一个项目
      </ThemedText>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        <View style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary}>项目列表</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProject}>
            <FontAwesome6 name="plus" size={20} color={theme.buttonPrimaryText} />
          </TouchableOpacity>
        </View>

        {/* Tab 切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'contract' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab('contract')}
            activeOpacity={0.7}
          >
            <ThemedText 
              variant="body" 
              color={activeTab === 'contract' ? theme.buttonPrimaryText : theme.textSecondary}
              style={{ fontWeight: activeTab === 'contract' ? '600' : '400' }}
            >
              工程项目
            </ThemedText>
            <View style={[
              styles.tabBadge,
              { backgroundColor: activeTab === 'contract' ? 'rgba(255,255,255,0.3)' : theme.border }
            ]}>
              <ThemedText 
                variant="caption" 
                color={activeTab === 'contract' ? theme.buttonPrimaryText : theme.textMuted}
                style={{ fontSize: 11 }}
              >
                {projectCounts.contractCount}
              </ThemedText>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'delivery' && { backgroundColor: '#E53935' }
            ]}
            onPress={() => setActiveTab('delivery')}
            activeOpacity={0.7}
          >
            <ThemedText 
              variant="body" 
              color={activeTab === 'delivery' ? '#FFFFFF' : theme.textSecondary}
              style={{ fontWeight: activeTab === 'delivery' ? '600' : '400' }}
            >
              零星采购
            </ThemedText>
            <View style={[
              styles.tabBadge,
              { backgroundColor: activeTab === 'delivery' ? 'rgba(255,255,255,0.3)' : theme.border }
            ]}>
              <ThemedText 
                variant="caption" 
                color={activeTab === 'delivery' ? '#FFFFFF' : theme.textMuted}
                style={{ fontSize: 11 }}
              >
                {projectCounts.deliveryCount}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredProjects}
          renderItem={renderProjectItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>

      {/* 图片预览模态框 */}
      <Modal
        visible={imagePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 60,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
            onPress={() => setImagePreviewVisible(false)}
          >
            <FontAwesome6 name="xmark" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Image 
            source={{ uri: previewImageUrl }} 
            style={{ width: '100%', height: '80%' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </Screen>
  );
}
