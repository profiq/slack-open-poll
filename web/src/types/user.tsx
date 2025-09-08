import type { BaseDocument } from '@/types/baseDocument.tsx';

export interface User extends BaseDocument {
  id: string;
  name: string;
}