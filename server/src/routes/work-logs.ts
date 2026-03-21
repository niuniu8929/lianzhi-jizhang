import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertWorkLogSchema, insertWorkLogItemSchema, updateWorkLogSchema } from '../storage/database/shared/schema';

const router = express.Router();

// 获取工时记录列表
router.get('/', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    const client = getSupabaseClient();
    let query = client
      .from('work_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // 筛选项目
    if (projectId) {
      query = query.eq('project_id', projectId as string);
    }

    // 筛选日期范围
    if (startDate) {
      query = query.gte('date', startDate as string);
    }
    if (endDate) {
      query = query.lte('date', endDate as string);
    }

    const { data: workLogs, error } = await query;

    if (error) {
      console.error('获取工时记录失败:', error);
      return res.status(500).json({ error: '获取工时记录失败' });
    }

    // 获取项目信息
    const projectIds = [...new Set((workLogs || []).map(log => log.project_id))];
    const { data: projects } = await client
      .from('projects')
      .select('id, name')
      .in('id', projectIds.length > 0 ? projectIds : ['']);

    // 创建项目映射
    const projectMap = new Map(
      (projects || []).map(p => [p.id, p.name])
    );

    // 获取每个工时记录的人员明细
    const workLogsWithWorkers = await Promise.all(
      (workLogs || []).map(async (workLog) => {
        const { data: items } = await client
          .from('work_log_items')
          .select('worker_id, hours')
          .eq('work_log_id', workLog.id);

        // 获取人员信息
        const workerIds = [...new Set((items || []).map(item => item.worker_id))];
        const { data: workers } = await client
          .from('workers')
          .select('id, name')
          .in('id', workerIds.length > 0 ? workerIds : ['']);

        const workerMap = new Map(
          (workers || []).map(w => [w.id, w.name])
        );

        return {
          ...workLog,
          projectName: projectMap.get(workLog.project_id) || '未知项目',
          workers: (items || []).map(item => ({
            id: item.worker_id,
            name: workerMap.get(item.worker_id) || '未知人员',
            hours: parseFloat(item.hours),
          })),
        };
      })
    );

    res.json({ workLogs: workLogsWithWorkers });
  } catch (error) {
    console.error('获取工时记录异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建工时记录
router.post('/', async (req, res) => {
  try {
    const { projectId, date, description, workers } = req.body;

    // 参数验证
    const validation = insertWorkLogSchema.safeParse({ projectId, date, description });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: '至少选择一个人员' });
    }

    const client = getSupabaseClient();

    // 使用事务创建工时记录和明细
    const { data: workLog, error: workLogError } = await client
      .from('work_logs')
      .insert({
        project_id: projectId,
        date,
        description,
      })
      .select()
      .single();

    if (workLogError) {
      console.error('创建工时记录失败:', workLogError);
      return res.status(500).json({ error: '创建工时记录失败' });
    }

    // 批量创建人员工时明细
    const items = workers.map((worker: any) => ({
      work_log_id: workLog.id,
      worker_id: worker.id,
      hours: worker.hours || 1, // 默认 1 个工时
    }));

    const { data: workLogItems, error: itemsError } = await client
      .from('work_log_items')
      .insert(items)
      .select('worker_id, hours');

    if (itemsError) {
      console.error('创建工时明细失败:', itemsError);
      // 回滚主记录
      await client.from('work_logs').delete().eq('id', workLog.id);
      return res.status(500).json({ error: '创建工时明细失败' });
    }

    // 获取人员信息
    const workerIds = [...new Set((workLogItems || []).map(item => item.worker_id))];
    const { data: workersData } = await client
      .from('workers')
      .select('id, name')
      .in('id', workerIds.length > 0 ? workerIds : ['']);

    const workerMap = new Map(
      (workersData || []).map(w => [w.id, w.name])
    );

    // 获取项目信息
    const { data: projectData } = await client
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    res.status(201).json({
      workLog: {
        ...workLog,
        projectName: projectData?.name || '未知项目',
        workers: (workLogItems || []).map(item => ({
          id: item.worker_id,
          name: workerMap.get(item.worker_id) || '未知人员',
          hours: parseFloat(item.hours),
        })),
      },
    });
  } catch (error) {
    console.error('创建工时记录异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除工时记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 先删除明细
    await client.from('work_log_items').delete().eq('work_log_id', id);

    // 再删除主记录
    const { error } = await client.from('work_logs').delete().eq('id', id);

    if (error) {
      console.error('删除工时记录失败:', error);
      return res.status(500).json({ error: '删除工时记录失败' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除工时记录异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新工时记录
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, date, description, workers } = req.body;

    // 参数验证
    const validation = updateWorkLogSchema.safeParse({ projectId, date, description });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: '至少选择一个人员' });
    }

    const client = getSupabaseClient();

    // 更新主记录
    const { data: workLog, error: workLogError } = await client
      .from('work_logs')
      .update({
        project_id: projectId,
        date,
        description,
      })
      .eq('id', id)
      .select()
      .single();

    if (workLogError) {
      console.error('更新工时记录失败:', workLogError);
      return res.status(500).json({ error: '更新工时记录失败' });
    }

    // 删除旧的明细
    await client.from('work_log_items').delete().eq('work_log_id', id);

    // 创建新的明细
    const items = workers.map((worker: any) => ({
      work_log_id: workLog.id,
      worker_id: worker.id,
      hours: worker.hours || 1,
    }));

    const { data: workLogItems, error: itemsError } = await client
      .from('work_log_items')
      .insert(items)
      .select('worker_id, hours');

    if (itemsError) {
      console.error('更新工时明细失败:', itemsError);
      return res.status(500).json({ error: '更新工时明细失败' });
    }

    // 获取人员信息
    const workerIds = [...new Set((workLogItems || []).map(item => item.worker_id))];
    const { data: workersData } = await client
      .from('workers')
      .select('id, name')
      .in('id', workerIds.length > 0 ? workerIds : ['']);

    const workerMap = new Map(
      (workersData || []).map(w => [w.id, w.name])
    );

    // 获取项目信息
    const { data: projectData } = await client
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    res.json({
      workLog: {
        ...workLog,
        projectName: projectData?.name || '未知项目',
        workers: (workLogItems || []).map(item => ({
          id: item.worker_id,
          name: workerMap.get(item.worker_id) || '未知人员',
          hours: parseFloat(item.hours),
        })),
      },
    });
  } catch (error) {
    console.error('更新工时记录异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
