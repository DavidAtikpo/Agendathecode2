'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Note } from '../types';
import { buildWhatsAppReminderUrl, normalizeWhatsAppPhone } from './whatsappReminder';

const firedKey = (noteId: string) => `agenda-reminder-fired-${noteId}`;

/** Une notification par couple (note + date de rappel), pour éviter les doublons. */
function alreadyFired(noteId: string, remindAt: string) {
  try {
    return sessionStorage.getItem(firedKey(noteId)) === remindAt;
  } catch {
    return false;
  }
}

function markFired(noteId: string, remindAt: string) {
  try {
    sessionStorage.setItem(firedKey(noteId), remindAt);
  } catch {
    /* ignore */
  }
}

export function formatReminderLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type WhatsAppReminderOptions = {
  /** Numéro saisi par l’utilisateur (indicatif pays, ex. 33612…) */
  whatsappPhoneRaw: string;
  /** Ouvrir l’onglet WhatsApp dès que le rappel part (peut être bloqué par le navigateur) */
  whatsappAutoOpen: boolean;
};

export function useNoteReminders(notes: Note[], whatsapp: WhatsAppReminderOptions) {
  const [inAppReminder, setInAppReminder] = useState<Note | null>(null);
  const waOpts = useRef(whatsapp);
  waOpts.current = whatsapp;

  const dismissInApp = useCallback(() => setInAppReminder(null), []);

  const openWhatsAppForNote = useCallback((n: Note) => {
    const digits = normalizeWhatsAppPhone(waOpts.current.whatsappPhoneRaw);
    if (!digits) return;
    const url = buildWhatsAppReminderUrl(digits, n.title, n.content ?? '');
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const { whatsappPhoneRaw, whatsappAutoOpen } = waOpts.current;
      const waDigits = normalizeWhatsAppPhone(whatsappPhoneRaw);

      for (const n of notes) {
        if (!n.remindAt) continue;
        if (new Date(n.remindAt).getTime() > now) continue;
        if (alreadyFired(n.id, n.remindAt)) continue;

        markFired(n.id, n.remindAt);

        const waUrl = waDigits ? buildWhatsAppReminderUrl(waDigits, n.title, n.content ?? '') : null;

        const notifSupported = typeof Notification !== 'undefined';
        const notifGranted = notifSupported && Notification.permission === 'granted';

        if (notifGranted) {
          const notif = new Notification(`Rappel : ${n.title}`, {
            body: n.content?.trim()
              ? n.content.slice(0, 160)
              : waUrl
                ? 'Touchez pour ouvrir WhatsApp avec le message du rappel.'
                : 'Voir votre idée dans Agenda',
            tag: `reminder-${n.id}-${n.remindAt}`,
          });
          if (waUrl) {
            notif.onclick = () => {
              window.open(waUrl, '_blank', 'noopener,noreferrer');
              notif.close();
            };
          }
        } else {
          setInAppReminder(n);
          if (whatsappAutoOpen && waUrl) {
            window.open(waUrl, '_blank', 'noopener,noreferrer');
          }
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [notes]);

  return { inAppReminder, dismissInApp, openWhatsAppForNote };
}

export async function requestReminderPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function toDatetimeLocalValue(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Chaîne vide → pas de rappel */
export function fromDatetimeLocalValue(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const ms = new Date(t).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(t).toISOString();
}

export function formatReminderRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const now = Date.now();
  const diff = t - now;
  if (diff > 0 && diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `dans ${h} h${m ? ` ${m} min` : ''}`;
    if (m > 0) return `dans ${m} min`;
    return 'bientôt';
  }
  if (diff >= 86_400_000) {
    const d = Math.ceil(diff / 86_400_000);
    return `dans ${d} j`;
  }
  return formatReminderLabel(iso);
}
