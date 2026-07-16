import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Feather,
  GraduationCap,
  Heart,
  Microscope,
  Sparkles,
  SquareDashed,
} from 'lucide-react';
import { SCENARIOS } from '../lib/scenarios';
import type { ScenarioId } from '../types';

const icons = {
  GraduationCap,
  BriefcaseBusiness,
  Heart,
  Microscope,
  Feather,
  SquareDashed,
};

interface Props {
  onComplete: (selected: ScenarioId[]) => Promise<void>;
}

export function Onboarding({ onComplete }: Props) {
  const [selected, setSelected] = useState<ScenarioId[]>([]);
  const [busy, setBusy] = useState(false);
  const selectedNames = useMemo(
    () => SCENARIOS.filter((item) => selected.includes(item.id)).map((item) => item.name),
    [selected],
  );

  const toggle = (id: ScenarioId) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await onComplete(selected);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-glow onboarding-glow-one" />
      <div className="onboarding-glow onboarding-glow-two" />
      <main className="onboarding-card">
        <div className="brand-mark"><Sparkles size={18} /></div>
        <div className="eyebrow">欢迎使用 Knowledge</div>
        <h1>先选择你的使用场景</h1>
        <p className="onboarding-lead">
          所有模式共享同一套知识内核，只调整模板、入口和默认工作流。
          你可以同时选择多个模式，也可以稍后在设置中更改。
        </p>

        <div className="scenario-grid">
          {SCENARIOS.map((scenario) => {
            const Icon = icons[scenario.icon as keyof typeof icons] ?? SquareDashed;
            const active = selected.includes(scenario.id);
            return (
              <button
                className={'scenario-card' + (active ? ' selected' : '')}
                key={scenario.id}
                onClick={() => toggle(scenario.id)}
                style={{ '--scenario-color': scenario.color } as React.CSSProperties}
              >
                <span className="scenario-icon"><Icon size={21} /></span>
                <span className="scenario-copy">
                  <strong>{scenario.name}</strong>
                  <small>{scenario.description}</small>
                </span>
                <span className="scenario-check">{active && <Check size={14} />}</span>
              </button>
            );
          })}
        </div>

        <div className="onboarding-footer">
          <div className="selected-summary">
            {selectedNames.length
              ? '将启用：' + selectedNames.join('、')
              : '请选择至少一个模式'}
          </div>
          <button className="primary-button" disabled={!selected.length || busy} onClick={submit}>
            {busy ? '正在创建知识库…' : '进入知识库'}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
      </main>
    </div>
  );
}
