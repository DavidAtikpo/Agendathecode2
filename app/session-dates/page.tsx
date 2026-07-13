'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Ancienne URL — redirige vers l’app principale avec la vue intégrée. */
export default function SessionDatesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?view=session-dates');
  }, [router]);

  return null;
}
