import rc from 'rc';
import { Config } from './types';

const DEFAULT_CONFIG: Config = {
  author: 'Unknown Author',
  language: 'en',
  publisher: '',
  outputDir: './output',
  rights: 'All rights reserved',
};

/**
 * Load configuration from rc files (.md-to-epubrc)
 * Searches in current directory, home directory, and their parent directories
 */
export function loadConfig(overrides?: Partial<Config>): Config {
  const rcConfig = rc('md-to-epub', DEFAULT_CONFIG);

  // Merge: defaults < rc file < CLI overrides
  return {
    ...DEFAULT_CONFIG,
    ...rcConfig,
    ...overrides,
  };
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}
