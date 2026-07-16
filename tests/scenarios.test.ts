import { describe, expect, it } from 'vitest';
import { createScenarioNotes, enabledFeatureNames, SCENARIOS, scenarioById } from '../src/lib/scenarios';

describe('scenario modes', () => {
  it('exposes all six product modes', () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([
      'study',
      'work',
      'personal',
      'research',
      'creation',
      'blank',
    ]);
  });

  it('creates starter content while preserving the unified note model', () => {
    const notes = createScenarioNotes(['study', 'work']);
    expect(notes).toHaveLength(4);
    expect(notes.every((item) => item.id && item.createdAt && item.updatedAt)).toBe(true);
    expect(notes.some((item) => item.title === '学习总览')).toBe(true);
    expect(notes.some((item) => item.title === '工作台')).toBe(true);
  });

  it('does not duplicate an existing starter note', () => {
    const notes = createScenarioNotes(['study'], ['学习总览']);
    expect(notes.map((item) => item.title)).toEqual(['知识点模板']);
  });

  it('combines enabled features without duplicates', () => {
    expect(enabledFeatureNames(['study', 'work'])).toContain('任务');
    expect(new Set(enabledFeatureNames(['study', 'work'])).size).toBe(enabledFeatureNames(['study', 'work']).length);
    expect(scenarioById('blank')?.starterNotes).toEqual([]);
  });
});
