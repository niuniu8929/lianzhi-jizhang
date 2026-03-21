import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// ==================== 类型定义 ====================

export interface Project {
  id: number;
  name: string;
  createdAt: string;
}

export interface Worker {
  id: number;
  name: string;
  createdAt: string;
}

export interface WorkerInLog {
  id: number;
  name: string;
  hours: number;
}

export interface WorkLog {
  id: number;
  date: string;
  projectId: number;
  projectName: string;
  description: string;
  workers: WorkerInLog[];
  createdAt: string;
}

export interface WorkerHours {
  workerId: number;
  workerName: string;
  totalHours: number;
}

export interface ProjectHours {
  projectId: number;
  projectName: string;
  totalHours: number;
}

export interface ExportedData {
  version: string;
  exportDate: string;
  projects: Project[];
  workers: Worker[];
  workLogs: WorkLog[];
  templates: WorkTemplate[];
}

// ==================== 工时模板 ====================

export interface WorkTemplate {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  workers: WorkerInLog[];
  description: string;
  createdAt: string;
}

export interface ImportResult {
  projectsCount: number;
  workersCount: number;
  workLogsCount: number;
}

// ==================== 键名定义 ====================

const KEYS = {
  PROJECTS: '@workhours_projects',
  WORKERS: '@workhours_workers',
  WORK_LOGS: '@workhours_logs',
  TEMPLATES: '@workhours_templates',
  NEXT_ID: '@workhours_next_id',
  LAST_BACKUP: '@workhours_last_backup',
} as const;

// ==================== 辅助函数 ====================

/**
 * 生成新的自增 ID
 */
async function getNextId(): Promise<number> {
  const nextIdStr = await AsyncStorage.getItem(KEYS.NEXT_ID);
  const nextId = nextIdStr ? parseInt(nextIdStr, 10) : 1;
  await AsyncStorage.setItem(KEYS.NEXT_ID, String(nextId + 1));
  return nextId;
}

/**
 * 重置 ID 计数器（用于导入数据后）
 */
async function resetNextId(maxId: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.NEXT_ID, String(maxId + 1));
}

// ==================== 项目管理 ====================

export const projectService = {
  async getAll(): Promise<Project[]> {
    const data = await AsyncStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  async getById(id: number): Promise<Project | null> {
    const projects = await this.getAll();
    return projects.find(p => p.id === id) || null;
  },

  async create(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const projects = await this.getAll();
    const id = await getNextId();
    const newProject: Project = {
      ...project,
      id,
      createdAt: new Date().toISOString(),
    };
    projects.push(newProject);
    await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    return newProject;
  },

  async update(id: number, updates: Partial<Pick<Project, 'name'>>): Promise<Project> {
    const projects = await this.getAll();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('项目不存在');
    }
    projects[index] = { ...projects[index], ...updates };
    await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    return projects[index];
  },

  async delete(id: number): Promise<void> {
    const projects = await this.getAll();
    const filtered = projects.filter(p => p.id !== id);
    await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(filtered));

    // 同时删除相关的工时记录
    const logs = await workLogService.getAll();
    const filteredLogs = logs.filter(log => log.projectId !== id);
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(filteredLogs));
  },
};

// ==================== 人员管理 ====================

export const workerService = {
  async getAll(): Promise<Worker[]> {
    const data = await AsyncStorage.getItem(KEYS.WORKERS);
    return data ? JSON.parse(data) : [];
  },

  async getById(id: number): Promise<Worker | null> {
    const workers = await this.getAll();
    return workers.find(w => w.id === id) || null;
  },

  async create(worker: Omit<Worker, 'id' | 'createdAt'>): Promise<Worker> {
    const workers = await this.getAll();
    const id = await getNextId();
    const newWorker: Worker = {
      ...worker,
      id,
      createdAt: new Date().toISOString(),
    };
    workers.push(newWorker);
    await AsyncStorage.setItem(KEYS.WORKERS, JSON.stringify(workers));
    return newWorker;
  },

  async update(id: number, updates: Partial<Pick<Worker, 'name'>>): Promise<Worker> {
    const workers = await this.getAll();
    const index = workers.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('人员不存在');
    }
    workers[index] = { ...workers[index], ...updates };
    await AsyncStorage.setItem(KEYS.WORKERS, JSON.stringify(workers));
    return workers[index];
  },

  async delete(id: number): Promise<void> {
    const workers = await this.getAll();
    const filtered = workers.filter(w => w.id !== id);
    await AsyncStorage.setItem(KEYS.WORKERS, JSON.stringify(filtered));

    // 同时删除工时记录中该人员的数据
    const logs = await workLogService.getAll();
    const updatedLogs = logs.map(log => ({
      ...log,
      workers: log.workers.filter(w => w.id !== id),
    })).filter(log => log.workers.length > 0);
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(updatedLogs));
  },
};

// ==================== 工时记录管理 ====================

export const workLogService = {
  async getAll(): Promise<WorkLog[]> {
    const data = await AsyncStorage.getItem(KEYS.WORK_LOGS);
    return data ? JSON.parse(data) : [];
  },

  async getById(id: number): Promise<WorkLog | null> {
    const logs = await this.getAll();
    return logs.find(l => l.id === id) || null;
  },

  async create(log: Omit<WorkLog, 'id' | 'createdAt'>): Promise<WorkLog> {
    const logs = await this.getAll();
    const id = await getNextId();
    const newLog: WorkLog = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };
    logs.push(newLog);
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(logs));
    return newLog;
  },

  async update(id: number, updates: Partial<Omit<WorkLog, 'id' | 'createdAt'>>): Promise<WorkLog> {
    const logs = await this.getAll();
    const index = logs.findIndex(l => l.id === id);
    if (index === -1) {
      throw new Error('工时记录不存在');
    }
    logs[index] = { ...logs[index], ...updates };
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(logs));
    return logs[index];
  },

  async delete(id: number): Promise<void> {
    const logs = await this.getAll();
    const filtered = logs.filter(l => l.id !== id);
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(filtered));
  },

  /**
   * 获取指定月份按人员统计的工时
   */
  async getMonthlyStats(year: number, month: number): Promise<WorkerHours[]> {
    const logs = await this.getAll();
    const workerMap = new Map<number, { name: string; hours: number }>();

    logs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate.getFullYear() === year && logDate.getMonth() === month) {
        log.workers.forEach(worker => {
          const existing = workerMap.get(worker.id);
          if (existing) {
            existing.hours += worker.hours;
          } else {
            workerMap.set(worker.id, { name: worker.name, hours: worker.hours });
          }
        });
      }
    });

    return Array.from(workerMap.entries()).map(([workerId, data]) => ({
      workerId,
      workerName: data.name,
      totalHours: data.hours,
    })).sort((a, b) => b.totalHours - a.totalHours);
  },

  /**
   * 获取指定日期范围按人员统计的工时
   */
  async getWorkerStatsByDateRange(startDate: Date, endDate: Date): Promise<WorkerHours[]> {
    const logs = await this.getAll();
    const workerMap = new Map<number, { name: string; hours: number }>();

    logs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate >= startDate && logDate <= endDate) {
        log.workers.forEach(worker => {
          const existing = workerMap.get(worker.id);
          if (existing) {
            existing.hours += worker.hours;
          } else {
            workerMap.set(worker.id, { name: worker.name, hours: worker.hours });
          }
        });
      }
    });

    return Array.from(workerMap.entries()).map(([workerId, data]) => ({
      workerId,
      workerName: data.name,
      totalHours: data.hours,
    })).sort((a, b) => b.totalHours - a.totalHours);
  },

  /**
   * 获取指定日期范围按项目统计的工时
   */
  async getProjectStatsByDateRange(startDate: Date, endDate: Date): Promise<ProjectHours[]> {
    const logs = await this.getAll();
    const projectMap = new Map<number, { name: string; hours: number }>();

    logs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate >= startDate && logDate <= endDate) {
        const existing = projectMap.get(log.projectId);
        const totalHours = log.workers.reduce((sum, w) => sum + w.hours, 0);
        if (existing) {
          existing.hours += totalHours;
        } else {
          projectMap.set(log.projectId, { name: log.projectName, hours: totalHours });
        }
      }
    });

    return Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      totalHours: data.hours,
    })).sort((a, b) => b.totalHours - a.totalHours);
  },

  /**
   * 获取指定月份按项目统计的工时
   */
  async getProjectStats(year: number, month: number): Promise<ProjectHours[]> {
    const logs = await this.getAll();
    const projectMap = new Map<number, { name: string; hours: number }>();

    logs.forEach(log => {
      const logDate = parseLocalDate(log.date);
      if (logDate.getFullYear() === year && logDate.getMonth() === month) {
        const existing = projectMap.get(log.projectId);
        const totalHours = log.workers.reduce((sum, w) => sum + w.hours, 0);
        if (existing) {
          existing.hours += totalHours;
        } else {
          projectMap.set(log.projectId, { name: log.projectName, hours: totalHours });
        }
      }
    });

    return Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      totalHours: data.hours,
    })).sort((a, b) => b.totalHours - a.totalHours);
  },
};

// ==================== 工时模板管理 ====================

export const templateService = {
  async getAll(): Promise<WorkTemplate[]> {
    const data = await AsyncStorage.getItem(KEYS.TEMPLATES);
    return data ? JSON.parse(data) : [];
  },

  async getById(id: number): Promise<WorkTemplate | null> {
    const templates = await this.getAll();
    return templates.find(t => t.id === id) || null;
  },

  async create(template: Omit<WorkTemplate, 'id' | 'createdAt'>): Promise<WorkTemplate> {
    const templates = await this.getAll();
    const id = await getNextId();
    const newTemplate: WorkTemplate = {
      ...template,
      id,
      createdAt: new Date().toISOString(),
    };
    templates.push(newTemplate);
    await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
    return newTemplate;
  },

  async update(id: number, updates: Partial<Omit<WorkTemplate, 'id' | 'createdAt'>>): Promise<WorkTemplate> {
    const templates = await this.getAll();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('模板不存在');
    }
    templates[index] = { ...templates[index], ...updates };
    await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
    return templates[index];
  },

  async delete(id: number): Promise<void> {
    const templates = await this.getAll();
    const filtered = templates.filter(t => t.id !== id);
    await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(filtered));
  },
};

// ==================== 数据导入导出 ====================

/**
 * 导出所有数据为 JSON 字符串
 */
export async function exportAllData(): Promise<string> {
  const projects = await projectService.getAll();
  const workers = await workerService.getAll();
  const workLogs = await workLogService.getAll();
  const templates = await templateService.getAll();

  const data: ExportedData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projects,
    workers,
    workLogs,
    templates,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * 从 JSON 字符串导入数据（增量合并，不覆盖现有数据）
 */
export async function importAllData(jsonData: string): Promise<ImportResult> {
  try {
    const data: ExportedData = JSON.parse(jsonData);

    // 验证数据格式
    if (!data.version || !Array.isArray(data.projects) || !Array.isArray(data.workers) || !Array.isArray(data.workLogs)) {
      throw new Error('数据格式不正确');
    }

    // 获取现有数据
    const existingProjects = await projectService.getAll();
    const existingWorkers = await workerService.getAll();
    const existingLogs = await workLogService.getAll();

    // 创建名称到ID的映射（用于项目和人员）
    const projectNameToId = new Map<string, number>();
    existingProjects.forEach(p => projectNameToId.set(p.name, p.id));

    const workerNameToId = new Map<string, number>();
    existingWorkers.forEach(w => workerNameToId.set(w.name, w.id));

    // 创建工时记录查找表（日期+项目ID -> 记录）
    const existingLogMap = new Map<string, typeof existingLogs[0]>();
    existingLogs.forEach(l => {
      existingLogMap.set(`${l.date}_${l.projectId}`, l);
    });

    // 统计新增数量
    let newProjectsCount = 0;
    let newWorkersCount = 0;
    let newLogsCount = 0;

    // 合并项目（按名称去重）
    const mergedProjects = [...existingProjects];
    const projectIdMapping = new Map<number, number>(); // 旧ID -> 新ID

    for (const project of data.projects) {
      const existingId = projectNameToId.get(project.name);
      if (existingId) {
        // 项目已存在，记录ID映射
        projectIdMapping.set(project.id, existingId);
      } else {
        // 新项目，分配新ID
        const newId = await getNextId();
        projectIdMapping.set(project.id, newId);
        mergedProjects.push({
          ...project,
          id: newId,
        });
        newProjectsCount++;
      }
    }

    // 合并人员（按名称去重）
    const mergedWorkers = [...existingWorkers];
    const workerIdMapping = new Map<number, number>(); // 旧ID -> 新ID

    for (const worker of data.workers) {
      const existingId = workerNameToId.get(worker.name);
      if (existingId) {
        // 人员已存在，记录ID映射
        workerIdMapping.set(worker.id, existingId);
      } else {
        // 新人员，分配新ID
        const newId = await getNextId();
        workerIdMapping.set(worker.id, newId);
        mergedWorkers.push({
          ...worker,
          id: newId,
        });
        newWorkersCount++;
      }
    }

    // 合并工时记录
    const mergedLogs = [...existingLogs];

    for (const log of data.workLogs) {
      // 获取映射后的项目ID
      const newProjectId = projectIdMapping.get(log.projectId);
      if (!newProjectId) continue; // 项目不存在则跳过

      // 映射人员ID
      const mappedWorkers = log.workers
        .map(w => {
          const newWorkerId = workerIdMapping.get(w.id);
          if (!newWorkerId) return null;
          return {
            id: newWorkerId,
            name: w.name,
            hours: w.hours,
          };
        })
        .filter((w): w is { id: number; name: string; hours: number } => w !== null);

      if (mappedWorkers.length === 0) continue; // 没有有效人员则跳过

      // 获取项目名称
      const project = mergedProjects.find(p => p.id === newProjectId);
      if (!project) continue;

      const logKey = `${log.date}_${newProjectId}`;
      const existingLog = existingLogMap.get(logKey);

      if (existingLog) {
        // 该日期+项目已有记录，合并人员
        const existingWorkerIds = new Set(existingLog.workers.map(w => w.id));
        let hasNewWorkers = false;

        for (const worker of mappedWorkers) {
          if (!existingWorkerIds.has(worker.id)) {
            // 新人员，添加到现有记录
            existingLog.workers.push(worker);
            hasNewWorkers = true;
          }
        }

        if (hasNewWorkers) {
          newLogsCount++;
        }
      } else {
        // 创建新工时记录
        const newId = await getNextId();
        mergedLogs.push({
          id: newId,
          date: log.date,
          projectId: newProjectId,
          projectName: project.name,
          description: log.description,
          workers: mappedWorkers,
          createdAt: log.createdAt,
        });
        existingLogMap.set(logKey, mergedLogs[mergedLogs.length - 1]);
        newLogsCount++;
      }
    }

    // 保存合并后的数据
    await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(mergedProjects));
    await AsyncStorage.setItem(KEYS.WORKERS, JSON.stringify(mergedWorkers));
    await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(mergedLogs));

    // 导入模板（如果存在，增量合并）
    if (data.templates && Array.isArray(data.templates)) {
      const existingTemplates = await templateService.getAll();
      const templateKeySet = new Set<string>();
      existingTemplates.forEach(t => templateKeySet.add(`${t.projectName}_${t.name}`));

      const mergedTemplates = [...existingTemplates];
      for (const template of data.templates) {
        const key = `${template.projectName}_${template.name}`;
        if (!templateKeySet.has(key)) {
          const newId = await getNextId();
          mergedTemplates.push({
            ...template,
            id: newId,
          });
        }
      }
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(mergedTemplates));
    }

    return {
      projectsCount: newProjectsCount,
      workersCount: newWorkersCount,
      workLogsCount: newLogsCount,
    };
  } catch (error: any) {
    throw new Error(`导入失败: ${error.message}`);
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify([]));
  await AsyncStorage.setItem(KEYS.WORKERS, JSON.stringify([]));
  await AsyncStorage.setItem(KEYS.WORK_LOGS, JSON.stringify([]));
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify([]));
  await AsyncStorage.setItem(KEYS.NEXT_ID, '1');
}

// ==================== 数据导出为 CSV ====================

/**
 * 解析 YYYY-MM-DD 格式的日期，避免时区偏移问题
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 导出月度工时明细为 CSV 格式
 */
export async function exportMonthlyCSV(year: number, month: number): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选指定月份的记录
  const monthlyLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate.getFullYear() === year && logDate.getMonth() === month;
  }).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // CSV 表头
  const headers = ['日期', '项目', '人员', '工作日', '工作内容'];
  const csvRows: string[] = [];

  // 添加表头
  csvRows.push(headers.join(','));

  // 添加数据行
  monthlyLogs.forEach(log => {
    log.workers.forEach(worker => {
      const row = [
        log.date,
        `"${log.projectName}"`,
        `"${worker.name}"`,
        worker.hours.toString(),
        `"${log.description.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });
  });

  // 添加 UTF-8 BOM 以支持中文
  return '\uFEFF' + csvRows.join('\n');
}

/**
 * 导出日期范围工时明细为 CSV 格式
 */
export async function exportDateRangeCSV(startDate: Date, endDate: Date): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选日期范围的记录
  const filteredLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate >= startDate && logDate <= endDate;
  }).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // CSV 表头
  const headers = ['日期', '项目', '人员', '工作日', '工作内容'];
  const csvRows: string[] = [];

  // 添加表头
  csvRows.push(headers.join(','));

  // 添加数据行
  filteredLogs.forEach(log => {
    log.workers.forEach(worker => {
      const row = [
        log.date,
        `"${log.projectName}"`,
        `"${worker.name}"`,
        worker.hours.toString(),
        `"${log.description.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });
  });

  // 添加 UTF-8 BOM 以支持中文
  return '\uFEFF' + csvRows.join('\n');
}

// ==================== 自动备份功能 ====================

/**
 * 检查是否需要执行自动备份
 * 规则：每天早上9点自动备份一次
 */
export async function checkAndAutoBackup(): Promise<boolean> {
  const now = new Date();
  const today9AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

  // 获取上次备份时间
  const lastBackupStr = await AsyncStorage.getItem(KEYS.LAST_BACKUP);
  const lastBackup = lastBackupStr ? new Date(lastBackupStr) : null;

  // 判断是否需要备份：
  // 1. 从未备份过，且当前时间已过今天9点
  // 2. 上次备份在今天9点之前，且当前时间已过今天9点
  const needBackup = !lastBackup || lastBackup < today9AM;

  if (needBackup && now >= today9AM) {
    await performAutoBackup();
    return true;
  }

  return false;
}

/**
 * 执行自动备份
 */
export async function performAutoBackup(): Promise<string> {
  // 导出数据
  const jsonData = await exportAllData();

  // 固定文件名：lianzhi.json（每天覆盖）
  const fileName = 'lianzhi.json';

  // 保存到APP根目录
  const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

  await (FileSystem as any).writeAsStringAsync(fileUri, jsonData);

  // 更新上次备份时间
  await AsyncStorage.setItem(KEYS.LAST_BACKUP, new Date().toISOString());

  return fileUri;
}

/**
 * 获取上次备份时间
 */
export async function getLastBackupTime(): Promise<Date | null> {
  const lastBackupStr = await AsyncStorage.getItem(KEYS.LAST_BACKUP);
  return lastBackupStr ? new Date(lastBackupStr) : null;
}

/**
 * 导出项目汇总为 CSV 格式
 */
export async function exportProjectSummaryCSV(year: number, month: number): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选指定月份的记录
  const monthlyLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate.getFullYear() === year && logDate.getMonth() === month;
  });

  // 计算每个项目的详细信息
  const projectDetails = new Map<number, { name: string; workers: Map<number, { name: string; hours: number }>; totalHours: number }>();

  monthlyLogs.forEach(log => {
    const existing = projectDetails.get(log.projectId);
    if (existing) {
      log.workers.forEach(w => {
        const workerStats = existing.workers.get(w.id);
        if (workerStats) {
          workerStats.hours += w.hours;
        } else {
          existing.workers.set(w.id, { name: w.name, hours: w.hours });
        }
      });
      existing.totalHours += log.workers.reduce((sum, w) => sum + w.hours, 0);
    } else {
      const workersMap = new Map<number, { name: string; hours: number }>();
      log.workers.forEach(w => workersMap.set(w.id, { name: w.name, hours: w.hours }));
      projectDetails.set(log.projectId, {
        name: log.projectName,
        workers: workersMap,
        totalHours: log.workers.reduce((sum, w) => sum + w.hours, 0),
      });
    }
  });

  // CSV 表头
  const headers = ['项目名称', '人员姓名', '工作日'];
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  Array.from(projectDetails.values())
    .sort((a, b) => b.totalHours - a.totalHours)
    .forEach(project => {
      Array.from(project.workers.values())
        .sort((a, b) => b.hours - a.hours)
        .forEach(worker => {
          const row = [
            `"${project.name}"`,
            `"${worker.name}"`,
            worker.hours.toString(),
          ];
          csvRows.push(row.join(','));
        });
    });

  return '\uFEFF' + csvRows.join('\n');
}

/**
 * 导出日期范围项目汇总为 CSV 格式
 */
export async function exportProjectSummaryByDateRange(startDate: Date, endDate: Date): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选日期范围的记录
  const filteredLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate >= startDate && logDate <= endDate;
  });

  // 计算每个项目的详细信息
  const projectDetails = new Map<number, { name: string; workers: Map<number, { name: string; hours: number }>; totalHours: number }>();

  filteredLogs.forEach(log => {
    const existing = projectDetails.get(log.projectId);
    if (existing) {
      log.workers.forEach(w => {
        const workerStats = existing.workers.get(w.id);
        if (workerStats) {
          workerStats.hours += w.hours;
        } else {
          existing.workers.set(w.id, { name: w.name, hours: w.hours });
        }
      });
      existing.totalHours += log.workers.reduce((sum, w) => sum + w.hours, 0);
    } else {
      const workersMap = new Map<number, { name: string; hours: number }>();
      log.workers.forEach(w => workersMap.set(w.id, { name: w.name, hours: w.hours }));
      projectDetails.set(log.projectId, {
        name: log.projectName,
        workers: workersMap,
        totalHours: log.workers.reduce((sum, w) => sum + w.hours, 0),
      });
    }
  });

  // CSV 表头
  const headers = ['项目名称', '人员姓名', '工作日'];
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  Array.from(projectDetails.values())
    .sort((a, b) => b.totalHours - a.totalHours)
    .forEach(project => {
      Array.from(project.workers.values())
        .sort((a, b) => b.hours - a.hours)
        .forEach(worker => {
          const row = [
            `"${project.name}"`,
            `"${worker.name}"`,
            worker.hours.toString(),
          ];
          csvRows.push(row.join(','));
        });
    });

  return '\uFEFF' + csvRows.join('\n');
}

/**
 * 导出人员汇总为 CSV 格式
 */
export async function exportWorkerSummaryCSV(year: number, month: number): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选指定月份的记录
  const monthlyLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate.getFullYear() === year && logDate.getMonth() === month;
  });

  // 计算每个人员的详细信息
  const workerDetails = new Map<number, { name: string; projects: Map<number, { name: string; hours: number }>; totalHours: number }>();

  monthlyLogs.forEach(log => {
    log.workers.forEach(w => {
      const existing = workerDetails.get(w.id);
      if (existing) {
        const projectStats = existing.projects.get(log.projectId);
        if (projectStats) {
          projectStats.hours += w.hours;
        } else {
          existing.projects.set(log.projectId, { name: log.projectName, hours: w.hours });
        }
        existing.totalHours += w.hours;
      } else {
        const projectsMap = new Map<number, { name: string; hours: number }>();
        projectsMap.set(log.projectId, { name: log.projectName, hours: w.hours });
        workerDetails.set(w.id, {
          name: w.name,
          projects: projectsMap,
          totalHours: w.hours,
        });
      }
    });
  });

  // CSV 表头
  const headers = ['人员姓名', '项目名称', '工作日'];
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  Array.from(workerDetails.values())
    .sort((a, b) => b.totalHours - a.totalHours)
    .forEach(worker => {
      Array.from(worker.projects.values())
        .sort((a, b) => b.hours - a.hours)
        .forEach(project => {
          const row = [
            `"${worker.name}"`,
            `"${project.name}"`,
            project.hours.toString(),
          ];
          csvRows.push(row.join(','));
        });
    });

  return '\uFEFF' + csvRows.join('\n');
}

/**
 * 导出日期范围人员汇总为 CSV 格式
 */
export async function exportWorkerSummaryByDateRange(startDate: Date, endDate: Date): Promise<string> {
  const logs = await workLogService.getAll();
  
  // 筛选日期范围的记录
  const filteredLogs = logs.filter(log => {
    const logDate = parseLocalDate(log.date);
    return logDate >= startDate && logDate <= endDate;
  });

  // 计算每个人员的详细信息
  const workerDetails = new Map<number, { name: string; projects: Map<number, { name: string; hours: number }>; totalHours: number }>();

  filteredLogs.forEach(log => {
    log.workers.forEach(w => {
      const existing = workerDetails.get(w.id);
      if (existing) {
        const projectStats = existing.projects.get(log.projectId);
        if (projectStats) {
          projectStats.hours += w.hours;
        } else {
          existing.projects.set(log.projectId, { name: log.projectName, hours: w.hours });
        }
        existing.totalHours += w.hours;
      } else {
        const projectsMap = new Map<number, { name: string; hours: number }>();
        projectsMap.set(log.projectId, { name: log.projectName, hours: w.hours });
        workerDetails.set(w.id, {
          name: w.name,
          projects: projectsMap,
          totalHours: w.hours,
        });
      }
    });
  });

  // CSV 表头
  const headers = ['人员姓名', '项目名称', '工作日'];
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  Array.from(workerDetails.values())
    .sort((a, b) => b.totalHours - a.totalHours)
    .forEach(worker => {
      Array.from(worker.projects.values())
        .sort((a, b) => b.hours - a.hours)
        .forEach(project => {
          const row = [
            `"${worker.name}"`,
            `"${project.name}"`,
            project.hours.toString(),
          ];
          csvRows.push(row.join(','));
        });
    });

  return '\uFEFF' + csvRows.join('\n');
}
