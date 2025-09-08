import type { BaseDocument } from '@/types/baseDocument.tsx';

export interface Channel extends BaseDocument {
  id: string;
  name: string;
}