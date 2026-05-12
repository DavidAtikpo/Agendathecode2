/**
 * Upload via XMLHttpRequest avec progression.
 * `fetch` ne donne pas accès aux events de téléversement ; on garde XHR
 * uniquement pour ça.
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0–100, ou null si la taille totale est inconnue. */
  percent: number | null;
  /** « uploading » tant que le navigateur envoie ; « processing » une fois
   *  100% atteint mais en attente de la réponse serveur (Cloudinary etc.). */
  phase: 'uploading' | 'processing';
}

export interface UploadOptions {
  onProgress?: (info: UploadProgress) => void;
  signal?: AbortSignal;
  /** Champs supplémentaires à inclure dans le FormData (ex. { kind: 'input' }). */
  fields?: Record<string, string>;
  /** Nom du champ fichier (par défaut « file »). */
  fieldName?: string;
}

export interface UploadResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function uploadWithProgress<T = unknown>(
  url: string,
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult<T>> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    for (const [k, v] of Object.entries(opts.fields ?? {})) {
      fd.append(k, v);
    }
    fd.append(opts.fieldName ?? 'file', file);

    xhr.open('POST', url, true);
    xhr.withCredentials = true;
    xhr.responseType = 'text';

    xhr.upload.onprogress = e => {
      if (!opts.onProgress) return;
      const total = e.lengthComputable ? e.total : 0;
      const percent = total > 0 ? Math.round((e.loaded / total) * 100) : null;
      opts.onProgress({
        loaded: e.loaded,
        total,
        percent,
        phase: percent != null && percent >= 100 ? 'processing' : 'uploading',
      });
    };

    xhr.upload.onload = () => {
      opts.onProgress?.({
        loaded: file.size,
        total: file.size,
        percent: 100,
        phase: 'processing',
      });
    };

    xhr.onload = () => {
      const status = xhr.status;
      let data: T | null = null;
      let error: string | undefined;
      const raw = xhr.responseText;
      try {
        data = raw ? (JSON.parse(raw) as T) : null;
      } catch {
        error = `Réponse invalide du serveur (${status})`;
      }
      const ok = status >= 200 && status < 300 && data !== null;
      if (!ok && !error) {
        const errFromBody =
          data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : undefined;
        error = errFromBody ?? `Erreur ${status}`;
      }
      resolve({ ok, status, data, error });
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: 0, data: null, error: 'Connexion interrompue' });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: 0, data: null, error: 'Téléversement annulé' });
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(fd);
  });
}
