'use client';

import { useEffect } from 'react';

export default function AuthCallbackPage() {
  useEffect(() => {
    const target = `/app.html${window.location.search || ''}${window.location.hash || ''}`;
    window.location.replace(target);
  }, []);

  return null;
}
