/** All entries remain until explicitly dismissed. No FIFO eviction or silent loss. */
export interface ToastQueueItem { id: string }
export type ToastQueueAction<T extends ToastQueueItem> = { type: 'upsert'; item: T } | { type: 'dismiss'; id: string } | { type: 'clear' };
export function toastQueueReducer<T extends ToastQueueItem>(state: readonly T[], action: ToastQueueAction<T>): readonly T[] {
  if (action.type === 'clear') return state.length ? [] : state;
  if (action.type === 'dismiss') return state.some(item => item.id === action.id) ? state.filter(item => item.id !== action.id) : state;
  if (!action.item.id.trim()) return state;
  const index = state.findIndex(item => item.id === action.item.id);
  if (index < 0) return [...state, action.item];
  return state.map((item, current) => current === index ? action.item : item);
}
