import type { AppLocale } from './types';

type DeepStringRecord = { [key: string]: string | DeepStringRecord };

export function t(
  messages: Record<AppLocale, DeepStringRecord>,
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let node: unknown = messages[locale];
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (_, name: string) => {
    const val = params[name];
    return val !== undefined ? String(val) : `{${name}}`;
  });
}
