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

export interface ChapterReference {
  filename: string; // basename without extension
  fullPath: string; // full path to the file
  id: string; // chapter ID like "chapter-1"
  title: string; // chapter title
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
