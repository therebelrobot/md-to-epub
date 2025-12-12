#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { convertMarkdownToEpub, convertDirectory, convertMarkdownFilesToChapters } from './converter';
import { loadConfig } from './config';
import { Config } from './types';

const program = new Command();

program
  .name('md-to-epub')
  .description('Convert markdown files to EPUB format')
  .version('1.0.0');

program
  .argument('<input...>', 'Input markdown file(s) or directory')
  .option('-o, --output <path>', 'Output EPUB file path')
  .option('-d, --output-dir <dir>', 'Output directory for EPUB files')
  .option('-r, --recursive', 'Process directories recursively', false)
  .option('--chapters', 'Combine multiple input files as chapters in a single EPUB', false)
  .option('-a, --author <name>', 'Book author name')
  .option('-t, --title <title>', 'Book title (overrides H1 from markdown)')
  .option('-l, --language <code>', 'Language code (e.g., en, es, fr)', 'en')
  .option('-p, --publisher <name>', 'Publisher name')
  .option('-c, --cover <path>', 'Path to cover image')
  .option('--description <text>', 'Book description')
  .option('--rights <text>', 'Copyright/rights statement')
  .option('--identifier <id>', 'Unique identifier (UUID will be generated if not provided)')
  .action(async (inputs: string[], options: any) => {
    try {
      // Load configuration from rc files
      const config: Config = loadConfig({
        author: options.author,
        language: options.language,
        publisher: options.publisher,
        cover: options.cover ? path.resolve(options.cover) : undefined,
        outputDir: options.outputDir,
        title: options.title,
        description: options.description,
        rights: options.rights,
        identifier: options.identifier,
      });

      // Resolve input paths
      const inputPaths = inputs.map((input) => path.resolve(input));

      // Validate all inputs exist
      for (const inputPath of inputPaths) {
        if (!fs.existsSync(inputPath)) {
          console.error(`Error: Input not found: ${inputPath}`);
          process.exit(1);
        }
      }

      // Handle multiple files with --chapters flag
      if (options.chapters && inputPaths.length > 1) {
        // Validate all are markdown files
        for (const inputPath of inputPaths) {
          if (!inputPath.endsWith('.md')) {
            console.error(`Error: All inputs must be markdown files (.md): ${inputPath}`);
            process.exit(1);
          }
        }

        // Convert multiple files to chapters
        const outputPath = options.output ? path.resolve(options.output) : '';
        await convertMarkdownFilesToChapters(inputPaths, outputPath, config);
        return;
      }

      // Handle single input
      if (inputPaths.length === 1) {
        const inputPath = inputPaths[0];
        const stats = fs.statSync(inputPath);

        if (stats.isDirectory()) {
          // Process directory
          if (options.chapters) {
            // Combine all markdown files in directory as chapters
            console.log(`Processing directory as chapters: ${inputPath}`);
            const markdownFiles: string[] = [];
            const scan = async (dir: string) => {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && options.recursive) {
                  await scan(fullPath);
                } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
                  markdownFiles.push(fullPath);
                }
              }
            };
            await scan(inputPath);
            markdownFiles.sort();

            if (markdownFiles.length === 0) {
              console.error(`Error: No markdown files found in: ${inputPath}`);
              process.exit(1);
            }

            const outputPath = options.output ? path.resolve(options.output) : '';
            await convertMarkdownFilesToChapters(markdownFiles, outputPath, config);
          } else {
            // Process each file separately
            console.log(`Processing directory: ${inputPath}`);
            await convertDirectory(inputPath, config, options.recursive);
          }
        } else if (stats.isFile()) {
          // Process single file
          if (!inputPath.endsWith('.md')) {
            console.error('Error: Input file must be a markdown file (.md)');
            process.exit(1);
          }

          await convertMarkdownToEpub({
            inputPath,
            outputPath: options.output ? path.resolve(options.output) : undefined,
            config,
          });
        } else {
          console.error('Error: Input must be a file or directory');
          process.exit(1);
        }
      } else {
        // Multiple inputs without --chapters flag
        console.error('Error: Multiple inputs require --chapters flag to combine into single EPUB');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
