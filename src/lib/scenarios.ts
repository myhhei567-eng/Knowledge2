import type { Note, ScenarioDefinition, ScenarioId } from '../types';

const now = () => new Date().toISOString();

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'study',
    name: '学习模式',
    description: '课程、知识点、错题与复习计划',
    color: '#6d7df2',
    icon: 'GraduationCap',
    features: ['课程', '知识点', '错题', '闪卡', '复习计划'],
    starterNotes: [
      {
        title: '学习总览',
        folder: '学习',
        tags: ['学习', '总览'],
        properties: { type: 'dashboard' },
        content: '# 学习总览\n\n## 本周课程\n\n- [ ] 整理课程资料\n- [ ] 创建第一张闪卡\n\n## 复习队列\n\n关联：[[知识点模板]]',
      },
      {
        title: '知识点模板',
        folder: '学习/模板',
        tags: ['知识点', '模板'],
        properties: { type: 'knowledge' },
        content: '# 知识点\n\n## 定义\n\n## 示例\n\n## 我的理解\n\n## 闪卡\n\n- Q：\n- A：',
      },
    ],
  },
  {
    id: 'work',
    name: '工作模式',
    description: '项目、会议、任务与周报',
    color: '#2e9b78',
    icon: 'BriefcaseBusiness',
    features: ['项目', '会议', '任务', '周报', '工作日志'],
    starterNotes: [
      {
        title: '工作台',
        folder: '工作',
        tags: ['工作', '总览'],
        properties: { type: 'dashboard' },
        content: '# 工作台\n\n## 当前项目\n\n- [ ] 定义本周最重要结果\n\n## 待跟进会议\n\n关联：[[会议记录模板]]',
      },
      {
        title: '会议记录模板',
        folder: '工作/模板',
        tags: ['会议', '模板'],
        properties: { type: 'meeting' },
        content: '# 会议主题\n\n- 日期：\n- 参与人：\n\n## 结论\n\n## 行动项\n\n- [ ] ',
      },
    ],
  },
  {
    id: 'personal',
    name: '个人模式',
    description: '日记、习惯、收藏与生活记录',
    color: '#d98b55',
    icon: 'Heart',
    features: ['日记', '习惯', '收藏', '生活记录'],
    starterNotes: [
      {
        title: '个人主页',
        folder: '个人',
        tags: ['个人'],
        properties: { type: 'dashboard' },
        content: '# 个人主页\n\n## 今天\n\n- [ ] 写下今天最重要的一件事\n\n## 习惯\n\n- [ ] 阅读\n- [ ] 运动',
      },
    ],
  },
  {
    id: 'research',
    name: '研究模式',
    description: '文献、网页摘录、PDF 与知识图谱',
    color: '#8c6ad7',
    icon: 'Microscope',
    features: ['文献', '网页摘录', 'PDF', '引用', '知识图谱'],
    starterNotes: [
      {
        title: '研究索引',
        folder: '研究',
        tags: ['研究', '索引'],
        properties: { type: 'dashboard' },
        content: '# 研究索引\n\n## 研究问题\n\n## 关键文献\n\n## 待验证假设\n\n- [ ] 添加第一篇文献',
      },
    ],
  },
  {
    id: 'creation',
    name: '创作模式',
    description: '灵感、素材、人物、章节与大纲',
    color: '#cc667f',
    icon: 'Feather',
    features: ['灵感', '素材', '人物', '章节', '大纲'],
    starterNotes: [
      {
        title: '创作空间',
        folder: '创作',
        tags: ['创作', '大纲'],
        properties: { type: 'dashboard' },
        content: '# 创作空间\n\n## 核心主题\n\n## 人物\n\n## 章节大纲\n\n- [ ] 写下第一个灵感',
      },
    ],
  },
  {
    id: 'blank',
    name: '空白模式',
    description: '从一个干净的知识库开始',
    color: '#718096',
    icon: 'SquareDashed',
    features: ['完全自定义'],
    starterNotes: [],
  },
];

export function scenarioById(id: ScenarioId) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

export function createScenarioNotes(ids: ScenarioId[], existingTitles: string[] = []): Note[] {
  const existing = new Set(existingTitles);
  return ids.flatMap((id) => {
    const scenario = scenarioById(id);
    if (!scenario) return [];
    return scenario.starterNotes
      .filter((starter) => !existing.has(starter.title))
      .map((starter) => ({
        ...starter,
        id: crypto.randomUUID(),
        favorite: false,
        createdAt: now(),
        updatedAt: now(),
      }));
  });
}

export function enabledFeatureNames(ids: ScenarioId[]): string[] {
  const features = ids.flatMap((id) => scenarioById(id)?.features ?? []);
  return [...new Set(features)];
}
