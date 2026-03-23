import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

/**
 * 按人员统计某月的工时总数
 * GET /api/v1/stats/worker/:year/:month
 */
router.get('/worker/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    // 验证参数
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '无效的年月参数' });
    }

    // 构建日期范围
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-31`;

    const client = getSupabaseClient();

    // 获取所有人员
    const { data: workers, error: workersError } = await client
      .from('workers')
      .select('*')
      .order('name');

    if (workersError) {
      console.error('获取人员列表失败:', workersError);
      return res.status(500).json({ error: '获取人员列表失败' });
    }

    // 获取该月所有工时记录的 ID
    const { data: workLogs, error: logsError } = await client
      .from('work_logs')
      .select('id, project_id, date, description')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (logsError) {
      console.error('获取工时记录失败:', logsError);
      return res.status(500).json({ error: '获取工时记录失败' });
    }

    // 获取工时明细
    const workLogIds = [...new Set((workLogs || []).map(log => log.id))];
    const { data: workLogItems, error: itemsError } = await client
      .from('work_log_items')
      .select('work_log_id, worker_id, hours')
      .in('work_log_id', workLogIds.length > 0 ? workLogIds : ['']);

    if (itemsError) {
      console.error('获取工时明细失败:', itemsError);
      return res.status(500).json({ error: '获取工时明细失败' });
    }

    // 获取所有项目信息
    const { data: projects } = await client.from('projects').select('*');

    // 创建工时记录 ID 到工作记录的映射
    const logToWorkLogMap = new Map(
      (workLogs || []).map((log: any) => [log.id, log])
    );

    // 按人员汇总工时，并统计每个人员的工作记录
    const workerStats = (workers || [])
      .map(worker => {
        // 找出该人员的所有工时明细
        const workerItems = (workLogItems || []).filter((item: any) =>
          item.worker_id === worker.id
        );

        // 如果没有工作记录，返回 null，稍后过滤
        if (workerItems.length === 0) {
          return null;
        }

        // 计算总工时
        const totalHours = workerItems.reduce((sum: number, item: any) =>
          sum + parseFloat(item.hours), 0
        );

        // 获取该人员的所有工作记录（按日期分组）
        const workRecords = workerItems.map((item: any) => {
          const workLog = logToWorkLogMap.get(item.work_log_id);
          const project = (projects || []).find((p: any) => p.id === workLog?.project_id);

          return {
            projectId: workLog?.project_id || '',
            projectName: project?.name || '未知项目',
            date: workLog?.date || '',
            description: workLog?.description || '',
            hours: parseFloat(item.hours),
          };
        });

        return {
          id: worker.id,
          name: worker.name,
          totalHours: parseFloat(totalHours.toFixed(2)),
          workRecords: workRecords.sort((a, b) => a.date.localeCompare(b.date)), // 按日期升序排列
        };
      })
      .filter((worker): worker is NonNullable<typeof worker> => worker !== null); // 过滤掉没有工作的工人

    res.json({
      year: yearNum,
      month: monthNum,
      stats: workerStats,
    });
  } catch (error) {
    console.error('按人员统计工时异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 按项目统计某月的工时总数及人员明细
 * GET /api/v1/stats/project/:year/:month
 */
router.get('/project/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    // 验证参数
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '无效的年月参数' });
    }

    // 构建日期范围
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-31`;

    const client = getSupabaseClient();

    // 获取所有项目
    const { data: projects, error: projectsError } = await client
      .from('projects')
      .select('*')
      .order('name');

    if (projectsError) {
      console.error('获取项目列表失败:', projectsError);
      return res.status(500).json({ error: '获取项目列表失败' });
    }

    // 获取该月所有工时记录的 ID 和项目 ID
    const { data: workLogs, error: logsError } = await client
      .from('work_logs')
      .select('id, project_id')
      .gte('date', startDate)
      .lte('date', endDate);

    if (logsError) {
      console.error('获取工时记录失败:', logsError);
      return res.status(500).json({ error: '获取工时记录失败' });
    }

    // 获取工时明细
    const workLogIds = [...new Set((workLogs || []).map(log => log.id))];
    const { data: workLogItems, error: itemsError } = await client
      .from('work_log_items')
      .select('work_log_id, worker_id, hours')
      .in('work_log_id', workLogIds.length > 0 ? workLogIds : ['']);

    if (itemsError) {
      console.error('获取工时明细失败:', itemsError);
      return res.status(500).json({ error: '获取工时明细失败' });
    }

    // 获取所有人员信息
    const { data: workers } = await client.from('workers').select('*');

    // 创建工时记录 ID 到项目 ID 的映射
    const logToProjectMap = new Map(
      (workLogs || []).map((log: any) => [log.id, log.project_id])
    );

    // 按项目汇总工时，并统计每个项目下的人员工时
    const projectStats = (projects || []).map(project => {
      // 找出该项目的所有工时记录 ID
      const projectWorkLogIds = (workLogs || [])
        .filter((log: any) => log.project_id === project.id)
        .map((log: any) => log.id);

      // 找出该项目的所有工时明细
      const projectItems = (workLogItems || []).filter((item: any) =>
        projectWorkLogIds.includes(item.work_log_id)
      );

      // 计算该项目所有工时明细的总工时
      const totalHours = projectItems.reduce((sum: number, item: any) =>
        sum + parseFloat(item.hours), 0
      );

      // 按人员统计每个项目下的工时
      const workerStats = new Map<string, number>();
      projectItems.forEach((item: any) => {
        const workerId = item.worker_id;
        const hours = parseFloat(item.hours);
        workerStats.set(workerId, (workerStats.get(workerId) || 0) + hours);
      });

      // 转换为数组并添加人员名称
      const workersDetail = Array.from(workerStats.entries()).map(([workerId, hours]) => {
        const worker = (workers || []).find((w: any) => w.id === workerId);
        return {
          id: workerId,
          name: worker?.name || '未知人员',
          hours: parseFloat(hours.toFixed(2)),
        };
      }).sort((a, b) => b.hours - a.hours); // 按工时降序排列

      return {
        id: project.id,
        name: project.name,
        totalHours: parseFloat(totalHours.toFixed(2)),
        workers: workersDetail,
      };
    });

    res.json({
      year: yearNum,
      month: monthNum,
      stats: projectStats,
    });
  } catch (error) {
    console.error('按项目统计工时异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
