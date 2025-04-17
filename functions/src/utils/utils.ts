import config from './config';

export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}
