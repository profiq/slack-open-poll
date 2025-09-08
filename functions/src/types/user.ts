import { BaseDocument } from './baseDocument';

export interface User extends BaseDocument {
  id: string;
  name: string;
}
