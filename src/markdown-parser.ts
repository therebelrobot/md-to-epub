import { marked } from 'marked';
import * as fs from 'fs';
import * as path from 'path';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import { MarkdownContent, ImageReference } from './types';

// Track images found during parsing
let parsedImages: ImageReference[] = [];
let currentBaseDir: string = '';
let markedConfigured = false;

// Escape HTML entities helper
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Configure marked with extensions for footnotes and custom image handling
 */
function configureMarked() {
  // Only configure once to avoid duplicate extensions
  if (markedConfigured) {
    return;
  }

  marked.setOptions({
    gfm: true, // GitHub Flavored Markdown
    breaks: false,
    pedantic: false,
  });

  // Add footnote support
  const footnoteExtension = {
    name: 'footnote',
    level: 'block' as const,
    start(src: string) {
      const match = src.match(/^\[\^[^\]]+\]:/);
      return match?.index;
    },
    tokenizer(src: string) {
      // Match footnote definitions: [^id]: text
      // Must be at start of line and have a colon
      const match = src.match(/^\[\^([^\]]+)\]:\s*(.+?)(?=\n\n|\n\[\^|$)/s);
      if (match) {
        return {
          type: 'footnote',
          raw: match[0],
          id: match[1],
          text: match[2].trim(),
        };
      }
    },
    renderer(token: any) {
      return `<div class="footnote" id="fn-${token.id}">
        <sup>${token.id}</sup> ${token.text}
      </div>\n`;
    },
  };

  const footnoteRefExtension = {
    name: 'footnoteRef',
    level: 'inline' as const,
    start(src: string) {
      const match = src.match(/\[\^[^\]]+\](?!:)/);
      return match?.index;
    },
    tokenizer(src: string) {
      // Match footnote references: [^id] but NOT [^id]:
      const match = src.match(/^\[\^([^\]]+)\](?!:)/);
      if (match) {
        return {
          type: 'footnoteRef',
          raw: match[0],
          id: match[1],
        };
      }
    },
    renderer(token: any) {
      return `<sup><a href="#fn-${token.id}" id="ref-${token.id}">${token.id}</a></sup>`;
    },
  };

  marked.use({ extensions: [footnoteExtension, footnoteRefExtension] });
  markedConfigured = true;
}

/**
 * Custom image renderer hook
 */
function customImageRenderer(href: string, title: string | null, text: string): string {
  // Resolve image path relative to markdown file
  let resolvedPath = href;

  // Handle local file paths
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    resolvedPath = path.resolve(currentBaseDir, href);
  }

  const id = `img-${uuidv4()}`;
  const mediaType = mime.lookup(href) || 'image/jpeg';

  parsedImages.push({
    src: href,
    resolvedPath,
    mediaType,
    id,
  });

  // Return XHTML-compliant image tag with reference to the image
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  const altAttr = ` alt="${escapeHtml(text)}"`;
  return `<img src="images/${path.basename(href)}"${altAttr}${titleAttr} />`;
}

/**
 * Extract title from markdown (first h1 heading)
 */
function extractTitle(markdownText: string): string | undefined {
  const h1Match = markdownText.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1] : undefined;
}

/**
 * Parse markdown file and extract content with images
 */
export async function parseMarkdown(filePath: string): Promise<MarkdownContent> {
  const markdownText = await fs.promises.readFile(filePath, 'utf-8');
  const baseDir = path.dirname(filePath);

  // Reset global state
  parsedImages = [];
  currentBaseDir = baseDir;

  configureMarked();

  // Set custom renderer for images and hr to ensure XHTML compliance
  marked.use({
    renderer: {
      image: customImageRenderer,
      hr: () => '<hr />',
    },
  });

  const html = await marked.parse(markdownText);
  const title = extractTitle(markdownText);

  return {
    html,
    images: parsedImages,
    title,
  };
}

/**
 * Generate CSS for EPUB
 */
export function getEpubCSS(): string {
  return `
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1em;
  color: #000;
}

h1, h2, h3, h4, h5, h6 {
  font-family: Arial, sans-serif;
  margin-top: 1em;
  margin-bottom: 0.5em;
  page-break-after: avoid;
}

h1 {
  font-size: 2em;
  border-bottom: 1px solid #ccc;
}

h2 {
  font-size: 1.5em;
}

p {
  margin: 0.5em 0;
  text-align: justify;
  text-indent: 1em;
}

p:first-of-type,
h1 + p,
h2 + p,
h3 + p,
h4 + p,
h5 + p,
h6 + p {
  text-indent: 0;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

code {
  font-family: 'Courier New', monospace;
  background-color: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

pre {
  background-color: #f4f4f4;
  padding: 1em;
  overflow-x: auto;
  border-radius: 5px;
}

pre code {
  background-color: transparent;
  padding: 0;
}

blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid #ccc;
  font-style: italic;
}

ul, ol {
  margin: 0.5em 0;
  padding-left: 2em;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.footnote {
  font-size: 0.9em;
  margin-top: 2em;
  padding-top: 0.5em;
  border-top: 1px solid #ccc;
}

a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`;
}
