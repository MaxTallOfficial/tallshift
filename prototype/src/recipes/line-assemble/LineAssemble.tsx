'use client';

import { Fragment, useLayoutEffect, useRef } from 'react';
import { connectLineAssemble, type LineOptions } from './line-controller';
import styles from './LineAssemble.module.css';

export interface LineAssembleProps extends LineOptions {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  /** Increment only after an explicit request to replay a heading already on screen. */
  replayKey?: number;
}

export function LineAssemble({ text, as: Tag = 'h2', duration, lineDelay, once, motion, className, replayKey = 0 }: LineAssembleProps) {
  const root = useRef<HTMLHeadingElement>(null);
  const controller = useRef<ReturnType<typeof connectLineAssemble> | null>(null);
  const previousReplay = useRef(replayKey);
  useLayoutEffect(() => {
    if (!root.current) return;
    const instance = connectLineAssemble(root.current, { duration, lineDelay, once, motion });
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [text, duration, lineDelay, once, motion]);
  useLayoutEffect(() => {
    if (previousReplay.current !== replayKey) { previousReplay.current = replayKey; controller.current?.replay(); }
  }, [replayKey]);
  return <Tag ref={root} className={[styles.heading, className].filter(Boolean).join(' ')}>{text.split(/(\s+)/u).map((part, index) => /^\s+$/u.test(part) ? <Fragment key={index}>{part}</Fragment> : <span key={index} className={styles.word} data-line-word="">{part}</span>)}</Tag>;
}
