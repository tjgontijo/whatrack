'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useSearchParamsClient(): Record<string, string> {
  const searchParams = useSearchParams();
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const p: Record<string, string> = {};
    searchParams.forEach((v, k) => (p[k] = v));
    setParams(p);
  }, [searchParams]);

  return params;
}
