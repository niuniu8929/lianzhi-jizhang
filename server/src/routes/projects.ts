import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertProjectSchema, updateProjectSchema } from '../storage/database/shared/schema';

const router = express.Router();

// 获取所有项目
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取项目列表失败:', error);
      return res.status(500).json({ error: '获取项目列表失败' });
    }

    res.json({ projects: data || [] });
  } catch (error) {
    console.error('获取项目列表异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建项目
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    // 参数验证
    const validation = insertProjectSchema.safeParse({ name });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('projects')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('创建项目失败:', error);
      return res.status(500).json({ error: '创建项目失败' });
    }

    res.status(201).json({ project: data });
  } catch (error) {
    console.error('创建项目异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新项目
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // 参数验证
    const validation = updateProjectSchema.safeParse({ name });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('projects')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新项目失败:', error);
      return res.status(500).json({ error: '更新项目失败' });
    }

    res.json({ project: data });
  } catch (error) {
    console.error('更新项目异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
