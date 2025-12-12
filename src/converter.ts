import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseMarkdown } from './markdown-parser';
import { generateEpub, generateMultiChapterEpub } from './epub-generator';
import { Config, EpubMetadata, ConversionOptions, Chapter, ImageReference } from './types';

/**
 * Convert a single markdown file to EPUB
 */
export async function convertMarkdownToEpub(options: ConversionOptions): Promise<string> {
  const { inputPath, outputPath, config } = options;

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Parse markdown
  console.log(`Parsing markdown file: ${inputPath}`);
  const { html, images, title } = await parseMarkdown(inputPath);

  // Determine output path
  const finalOutputPath =
    outputPath ||
    path.join(
      config?.outputDir || './output',
      path.basename(inputPath, path.extname(inputPath)) + '.epub'
    );

  // Ensure output directory exists
  const outputDir = path.dirname(finalOutputPath);
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Prepare metadata
  const metadata: EpubMetadata = {
    title: config?.title || title || path.basename(inputPath, path.extname(inputPath)),
    author: config?.author || 'Unknown Author',
    language: config?.language || 'en',
    publisher: config?.publisher,
    description: config?.description,
    rights: config?.rights || 'All rights reserved',
    identifier: config?.identifier || `urn:uuid:${uuidv4()}`,
    cover: config?.cover,
    createdDate: new Date().toISOString().split('T')[0],
  };

  // Generate EPUB
  console.log(`Generating EPUB: ${finalOutputPath}`);
  await generateEpub(html, metadata, images, finalOutputPath);

  console.log(`✓ Successfully created: ${finalOutputPath}`);
  return finalOutputPath;
}

/**
 * Convert multiple markdown files to EPUB (bulk conversion)
 */
export async function convertMultipleMarkdownToEpub(
  inputPaths: string[],
  config?: Config
): Promise<string[]> {
  const results: string[] = [];

  for (const inputPath of inputPaths) {
    try {
      const outputPath = await convertMarkdownToEpub({
        inputPath,
        config,
      });
      results.push(outputPath);
    } catch (error) {
      console.error(`Failed to convert ${inputPath}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Process a directory of markdown files
 */
export async function convertDirectory(
  dirPath: string,
  config?: Config,
  recursive: boolean = false
): Promise<string[]> {
  const markdownFiles = await findMarkdownFiles(dirPath, recursive);

  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found in: ${dirPath}`);
  }

  console.log(`Found ${markdownFiles.length} markdown file(s)`);
  return convertMultipleMarkdownToEpub(markdownFiles, config);
}

/**
 * Find all markdown files in a directory
 */
async function findMarkdownFiles(dirPath: string, recursive: boolean): Promise<string[]> {
  const files: string[] = [];

  async function scan(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && recursive) {
        await scan(fullPath);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await scan(dirPath);
  return files.sort(); // Sort for consistent ordering
}

/**
 * Convert multiple markdown files into a single EPUB with chapters
 */
export async function convertMarkdownFilesToChapters(
  inputPaths: string[],
  outputPath: string,
  config?: Config
): Promise<string> {
  if (inputPaths.length === 0) {
    throw new Error('No input files provided');
  }

  console.log(`Converting ${inputPaths.length} file(s) into chapters`);

  const chapters: Chapter[] = [];
  const allImages: ImageReference[] = [];
  const seenImages = new Set<string>();

  // Parse each markdown file
  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    console.log(`Parsing chapter ${i + 1}: ${path.basename(inputPath)}`);

    const { html, images, title } = await parseMarkdown(inputPath);

    // Create chapter
    const chapterTitle = title || path.basename(inputPath, path.extname(inputPath));
    chapters.push({
      title: chapterTitle,
      html,
      id: `chapter-${i + 1}`,
      order: i + 1,
    });

    // Collect unique images
    for (const image of images) {
      const imageKey = path.basename(image.src);
      if (!seenImages.has(imageKey)) {
        seenImages.add(imageKey);
        allImages.push(image);
      }
    }
  }

  // Determine book title and output path
  const bookTitle = config?.title || path.basename(inputPaths[0], path.extname(inputPaths[0]));
  const finalOutputPath = outputPath || path.join(
    config?.outputDir || './output',
    `${bookTitle}.epub`
  );

  // Ensure output directory exists
  const outputDir = path.dirname(finalOutputPath);
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Prepare metadata
  const metadata: EpubMetadata = {
    title: bookTitle,
    author: config?.author || 'Unknown Author',
    language: config?.language || 'en',
    publisher: config?.publisher,
    description: config?.description,
    rights: config?.rights || 'All rights reserved',
    identifier: config?.identifier || `urn:uuid:${uuidv4()}`,
    cover: config?.cover,
    createdDate: new Date().toISOString().split('T')[0],
  };

  // Generate multi-chapter EPUB
  console.log(`Generating EPUB with ${chapters.length} chapter(s): ${finalOutputPath}`);
  await generateMultiChapterEpub(chapters, metadata, allImages, finalOutputPath);

  console.log(`✓ Successfully created: ${finalOutputPath}`);
  return finalOutputPath;
}
