'use client';

import { useRef, useState } from 'react';
import { useLedgerReflow } from './useLedgerReflow';
import { useInputModality } from './useInputModality';
import { copy } from './copy';
import styles from './Demo.module.css';

export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; duration?: number; motion?: 'off' | 'subtle' | 'expressive' }
interface Task { id: string; index: number; done: boolean }
export function Demo({ locale = 'en', duration = 240, motion = 'subtle' }: DemoProps) {
  const t = copy[locale];
  const root = useRef<HTMLDivElement>(null);
  const nextId = useRef(5);
  const [tasks, setTasks] = useState<Task[]>([1, 2, 3, 4].map((id, index) => ({ id: String(id), index, done: id === 4 })));
  const [activeOnly, setActiveOnly] = useState(false);
  const shown = activeOnly ? tasks.filter(task => !task.done) : tasks;
  const { ref, capture } = useLedgerReflow(shown.map(task => task.id), { duration, motion });
  useInputModality(root);
  const title = (task: Task) => task.index < 4 ? t.tasks[task.index] : `${t.task} ${task.index - 3}`;
  return <div ref={root} className={styles.demo}>
    <header className={styles.header}><h2>{t.title}</h2><p>{t.help}</p></header>
    <div className={styles.controls}>
      <button type="button" onClick={() => { capture(); const id = nextId.current++; setTasks(current => [{ id: String(id), index: id - 1, done: false }, ...current]); }}>{t.add}</button>
      <button type="button" onClick={() => { capture(); setTasks(current => [...current].reverse()); }}>{t.sort}</button>
      <button type="button" aria-pressed={activeOnly} onClick={() => { capture(); setActiveOnly(value => !value); }}>{activeOnly ? t.all : t.filter}</button>
    </div>
    <p className={styles.count} role="status" aria-live="polite">{t.count} {shown.length}</p>
    <div className={styles.viewport}>
      <ul ref={ref} className={styles.list} aria-label={t.list} tabIndex={-1}>
        {shown.map(task => <li key={task.id} data-reflow-key={task.id} className={styles.row} tabIndex={-1}><div data-reflow-layer="" className={styles.layer}>
          <div className={styles.text}><h3>{title(task)}</h3><p>{task.done ? t.done : t.active}</p></div>
          <div className={styles.rowActions}><button type="button" aria-label={`${task.done ? t.reopen : t.complete}: ${title(task)}`} onClick={() => { capture(); setTasks(current => current.map(value => value.id === task.id ? { ...value, done: !value.done } : value)); }}>{task.done ? t.reopen : t.complete}</button><button type="button" aria-label={`${t.remove}: ${title(task)}`} onClick={() => { capture(); setTasks(current => current.filter(value => value.id !== task.id)); }}>{t.remove}</button></div>
        </div></li>)}
      </ul>
      {!shown.length && <p className={styles.empty}>{activeOnly ? t.empty : t.emptyAll}</p>}
    </div>
    <p className={styles.note}>{t.result}</p>
  </div>;
}
