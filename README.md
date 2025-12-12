# md-to-epub

A TypeScript CLI tool to convert markdown files to EPUB format for e-readers. Supports single file conversion and bulk processing with extensive markdown features including images, footnotes, tables, code blocks, and more.

## Features

- ✅ **Comprehensive Markdown Support**: Tables, code blocks, blockquotes, lists, and more
- 📷 **Image Embedding**: Automatically embeds images referenced in markdown
- 📝 **Footnotes**: Full support for markdown footnotes
- 📚 **Bulk Conversion**: Convert entire directories of markdown files
- ⚙️ **Configuration Files**: Use `.md-to-epubrc` files for project-wide settings
- 🎨 **Styled Output**: Professional EPUB formatting with customizable CSS
- 🔧 **CLI & Programmatic API**: Use as a command-line tool or import into your projects

## Installation

### Global Installation

```bash
npm install -g md-to-epub
```

### Local Installation

```bash
npm install md-to-epub
```

## Usage

### Command Line

#### Basic Usage

Convert a single markdown file:

```bash
md-to-epub input.md
```

This will create `output/input.epub` using default settings.

#### Specify Output Path

```bash
md-to-epub input.md -o mybook.epub
```

#### Set Metadata

```bash
md-to-epub input.md \
  --author "Jane Doe" \
  --title "My Great Book" \
  --language en \
  --publisher "My Publisher"
```

#### Include Cover Image

```bash
md-to-epub input.md --cover ./cover.jpg
```

#### Bulk Conversion

Convert all markdown files in a directory:

```bash
md-to-epub ./content-folder
```

Recursively process subdirectories:

```bash
md-to-epub ./content-folder --recursive
```

Specify output directory for bulk conversion:

```bash
md-to-epub ./content-folder --output-dir ./ebooks
```

#### Multi-Chapter Books

Combine multiple markdown files into a single EPUB with chapters:

```bash
md-to-epub chapter1.md chapter2.md chapter3.md --chapters -o book.epub
```

Combine all markdown files in a directory as chapters:

```bash
md-to-epub ./chapters-folder --chapters -o complete-book.epub
```

Recursively find and combine chapters:

```bash
md-to-epub ./book-project --chapters --recursive -o complete-book.epub
```

### Configuration File

Create a `.md-to-epubrc` file in your project directory or home directory to set default options:

**JSON format:**
```json
{
  "author": "Jane Doe",
  "language": "en",
  "publisher": "My Publishing House",
  "outputDir": "./ebooks",
  "rights": "Copyright © 2025 Jane Doe"
}
```

**INI format:**
```ini
author = Jane Doe
language = en
publisher = My Publishing House
outputDir = ./ebooks
rights = Copyright © 2025 Jane Doe
```

The configuration file will be automatically loaded from:
1. Current directory (`.md-to-epubrc`)
2. Parent directories (searching upward)
3. Home directory (`~/.md-to-epubrc`)

CLI options will override configuration file settings.

### Programmatic Usage

```typescript
import { convertMarkdownToEpub, convertMarkdownFilesToChapters, loadConfig } from 'md-to-epub';

// Convert single file
await convertMarkdownToEpub({
  inputPath: './content/chapter1.md',
  outputPath: './output/chapter1.epub',
  config: {
    author: 'Jane Doe',
    title: 'Chapter 1',
    language: 'en',
  },
});

// Convert multiple files to chapters in single EPUB
await convertMarkdownFilesToChapters(
  ['./ch1.md', './ch2.md', './ch3.md'],
  './output/book.epub',
  {
    author: 'Jane Doe',
    title: 'Complete Book',
    language: 'en',
  }
);

// Use configuration file
const config = loadConfig({ author: 'Override Author' });
await convertMarkdownToEpub({
  inputPath: './content/chapter1.md',
  config,
});

// Bulk conversion (separate EPUBs)
import { convertDirectory } from 'md-to-epub';

const outputFiles = await convertDirectory(
  './content',
  { author: 'Jane Doe', language: 'en' },
  true // recursive
);
console.log('Created:', outputFiles);
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `<input...>` | Input markdown file(s) or directory | (required) |
| `-o, --output <path>` | Output EPUB file path | `output/<filename>.epub` |
| `-d, --output-dir <dir>` | Output directory for bulk conversion | `./output` |
| `-r, --recursive` | Process directories recursively | `false` |
| `--chapters` | Combine multiple files as chapters in single EPUB | `false` |
| `-a, --author <name>` | Book author name | `Unknown Author` |
| `-t, --title <title>` | Book title (overrides H1 from markdown) | From first H1 or filename |
| `-l, --language <code>` | Language code (e.g., en, es, fr) | `en` |
| `-p, --publisher <name>` | Publisher name | - |
| `-c, --cover <path>` | Path to cover image | - |
| `--description <text>` | Book description | - |
| `--rights <text>` | Copyright/rights statement | `All rights reserved` |
| `--identifier <id>` | Unique identifier | Auto-generated UUID |

## Supported Markdown Features

- **Headings** (H1-H6)
- **Paragraphs** with proper text flow
- **Emphasis**: *italic*, **bold**, ***bold-italic***
- **Lists**: Ordered and unordered
- **Links**: Internal and external
- **Images**: Local files (automatically embedded)
- **Code**: Inline `code` and fenced code blocks
- **Blockquotes**
- **Tables**
- **Horizontal rules**
- **Footnotes**: `[^1]` with definitions

### Footnotes Example

```markdown
This is a paragraph with a footnote[^1].

Another paragraph with another footnote[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote.
```

### Images

Images are automatically embedded in the EPUB:

```markdown
![Alt text](./images/diagram.png)
![Cover](../cover.jpg "Image title")
```

Local image paths are resolved relative to the markdown file.

## Output Structure

The generated EPUB follows the EPUB 3.0 standard and includes:

- **Proper EPUB structure**: `mimetype`, `META-INF/container.xml`, `content.opf`, `toc.ncx`
- **Embedded images**: All referenced images are included
- **Styled content**: Professional CSS styling for optimal reading experience
- **Metadata**: Title, author, language, publisher, etc.
- **Navigation**: Table of contents based on document structure

## Examples

### Example 1: Simple Conversion

```bash
md-to-epub article.md
```

### Example 2: Book with Metadata

```bash
md-to-epub book.md \
  --title "The Complete Guide" \
  --author "John Smith" \
  --publisher "Tech Books Publishing" \
  --cover ./cover.png \
  --description "A comprehensive guide to everything"
```

### Example 3: Bulk Conversion with Config

Create `.md-to-epubrc`:
```json
{
  "author": "John Smith",
  "publisher": "Tech Books Publishing",
  "language": "en",
  "outputDir": "./ebooks"
}
```

Then run:
```bash
md-to-epub ./chapters --recursive
```

## Development

### Build from Source

```bash
git clone https://github.com/yourusername/md-to-epub.git
cd md-to-epub
npm install
npm run build
```

### Run Locally

```bash
npm start -- input.md -o output.epub
```

### Project Structure

```
md-to-epub/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── config.ts           # Configuration management
│   ├── converter.ts        # Main conversion logic
│   ├── epub-generator.ts   # EPUB file generation
│   ├── markdown-parser.ts  # Markdown parsing & rendering
│   ├── types.ts            # TypeScript type definitions
│   └── index.ts            # Public API exports
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT License - Copyright © 2025 Aster Haven

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Troubleshooting

### Images Not Appearing

- Ensure image paths are correct relative to the markdown file
- Check that image files exist and are readable
- Supported formats: JPEG, PNG, GIF, SVG

### EPUB Validation

The generated EPUBs follow the EPUB 3.0 standard. You can validate them using:
- [EPUBCheck](https://github.com/w3c/epubcheck)
- Online validators like [EPUB Validator](http://validator.idpf.org/)

### Common Issues

**Issue**: "Cannot find module" errors
- **Solution**: Run `npm install` to install dependencies

**Issue**: Permission denied when running globally
- **Solution**: Use `sudo npm install -g md-to-epub` or configure npm to use a local prefix

**Issue**: Output directory doesn't exist
- **Solution**: The tool creates output directories automatically, but ensure parent directories are writable

## Acknowledgments

Built with:
- [marked](https://github.com/markedjs/marked) - Markdown parser
- [archiver](https://github.com/archiverjs/node-archiver) - ZIP file creation
- [commander](https://github.com/tj/commander.js) - CLI framework
- [rc](https://github.com/dominictarr/rc) - Configuration file loader
