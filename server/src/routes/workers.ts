import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertWorkerSchema, updateWorkerSchema } from '../storage/database/shared/schema';

const router = express.Router();

// 获取所有人员
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取人员列表失败:', error);
      return res.status(500).json({ error: '获取人员列表失败' });
    }

    res.json({ workers: data || [] });
  } catch (error) {
    console.error('获取人员列表异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建人员
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    // 参数验证
    const validation = insertWorkerSchema.safeParse({ name });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('workers')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('创建人员失败:', error);
      return res.status(500).json({ error: '创建人员失败' });
    }

    res.status(201).json({ worker: data });
  } catch (error) {
    console.error('创建人员异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新人员
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // 参数验证
    const validation = updateWorkerSchema.safeParse({ name });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('workers')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新人员失败:', error);
      return res.status(500).json({ error: '更新人员失败' });
    }

    res.json({ worker: data });
  } catch (error) {
    console.error('更新人员异常:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
