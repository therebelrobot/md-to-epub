export interface Config {
  author?: string;
  language?: string;
  publisher?: string;
  cover?: string;
  outputDir?: string;
  title?: string;
  description?: string;
  rights?: string;
  identifier?: string;
}

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  publisher?: string;
  description?: string;
  rights?: string;
  identifier: string;
  cover?: string;
  createdDate: string;
}

export interface MarkdownContent {
  html: string;
  images: ImageReference[];
  title?: string;
}

export interface Chapter {
  title: string;
  html: string;
  id: string;
  order: number;
}

export interface ImageReference {
  src: string;
  resolvedPath: string;
  mediaType: string;
  id: string;
}

export interface ConversionOptions {
  inputPath: string;
  outputPath?: string;
  config?: Config;
}
