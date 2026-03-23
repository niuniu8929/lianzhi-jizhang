import { z } from 'zod';

// Zod schemas for validation

// Projects
export const insertProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').optional(),
});

// Workers
export const insertWorkerSchema = z.object({
  name: z.string().min(1, '人员姓名不能为空'),
});

export const updateWorkerSchema = z.object({
  name: z.string().min(1, '人员姓名不能为空').optional(),
});

// WorkLogs
export const insertWorkLogSchema = z.object({
  projectId: z.string().min(1, '项目ID不能为空'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确'),
  description: z.string().min(1, '工作内容不能为空'),
});

export const updateWorkLogSchema = z.object({
  projectId: z.string().min(1, '项目ID不能为空').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确').optional(),
  description: z.string().min(1, '工作内容不能为空').optional(),
});

// WorkLogItems
export const insertWorkLogItemSchema = z.object({
  workLogId: z.string().min(1, '工时记录ID不能为空'),
  workerId: z.string().min(1, '人员ID不能为空'),
  hours: z.number().min(0, '工时不能为负数'),
});

export const updateWorkLogItemSchema = z.object({
  workerId: z.string().min(1, '人员ID不能为空').optional(),
  hours: z.number().min(0, '工时不能为负数').optional(),
});

// TypeScript types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type UpdateWorker = z.infer<typeof updateWorkerSchema>;

export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type UpdateWorkLog = z.infer<typeof updateWorkLogSchema>;

export type InsertWorkLogItem = z.infer<typeof insertWorkLogItemSchema>;
export type UpdateWorkLogItem = z.infer<typeof updateWorkLogItemSchema>;
