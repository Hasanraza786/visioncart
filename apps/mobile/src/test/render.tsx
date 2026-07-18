import { QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { createQueryClient } from '../query/queryClient';

export function renderWithProviders(
  element: ReactElement,
  options?: RenderOptions,
): Promise<RenderResult> {
  const client = createQueryClient();

  return render(
    <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    options,
  );
}
