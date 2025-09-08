import { BaseDocument } from './baseDocument';

export interface Channel extends BaseDocument {
  id: string;
  name: string;
}
