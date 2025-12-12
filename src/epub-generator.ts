import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { EpubMetadata, ImageReference, Chapter } from './types';
import { getEpubCSS } from './markdown-parser';

/**
 * Download image from URL
 */
async function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'md-to-epub/1.0.0'
      }
    };

    protocol.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        if (response.headers.location) {
          downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    }).on('error', reject);
  });
}

/**
 * Generate EPUB file from HTML content and metadata (single chapter)
 */
export async function generateEpub(
  htmlContent: string,
  metadata: EpubMetadata,
  images: ImageReference[],
  outputPath: string
): Promise<void> {
  const tempDir = path.join(path.dirname(outputPath), `.epub-temp-${uuidv4()}`);

  try {
    // Create temporary directory structure
    await createEpubStructure(tempDir, htmlContent, metadata, images);

    // Create EPUB archive
    await createEpubArchive(tempDir, outputPath);

    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ensure cleanup on error
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    throw error;
  }
}

/**
 * Generate EPUB file from multiple chapters
 */
export async function generateMultiChapterEpub(
  chapters: Chapter[],
  metadata: EpubMetadata,
  images: ImageReference[],
  outputPath: string
): Promise<void> {
  const tempDir = path.join(path.dirname(outputPath), `.epub-temp-${uuidv4()}`);

  try {
    // Create temporary directory structure for multi-chapter book
    await createMultiChapterEpubStructure(tempDir, chapters, metadata, images);

    // Create EPUB archive
    await createEpubArchive(tempDir, outputPath);

    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ensure cleanup on error
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    throw error;
  }
}

/**
 * Create EPUB directory structure with all required files
 */
async function createEpubStructure(
  tempDir: string,
  htmlContent: string,
  metadata: EpubMetadata,
  images: ImageReference[]
): Promise<void> {
  // Create directory structure
  await fs.promises.mkdir(tempDir, { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'images'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'css'), { recursive: true });

  // Create mimetype file (must be first and uncompressed)
  await fs.promises.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf-8');

  // Create META-INF/container.xml
  await fs.promises.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    getContainerXml(),
    'utf-8'
  );

  // Create content.opf
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    getContentOpf(metadata, images),
    'utf-8'
  );

  // Create toc.ncx
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'toc.ncx'),
    getTocNcx(metadata),
    'utf-8'
  );

  // Create content.xhtml
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'content.xhtml'),
    getContentXhtml(htmlContent, metadata.title),
    'utf-8'
  );

  // Create stylesheet
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'css', 'style.css'),
    getEpubCSS(),
    'utf-8'
  );

  // Copy or download images
  for (const image of images) {
    try {
      const destPath = path.join(tempDir, 'OEBPS', 'images', path.basename(image.src));

      if (image.resolvedPath.startsWith('http://') || image.resolvedPath.startsWith('https://')) {
        // Download remote image
        console.log(`Downloading image: ${image.src}`);
        await downloadImage(image.resolvedPath, destPath);
      } else {
        // Copy local image
        await fs.promises.copyFile(image.resolvedPath, destPath);
      }
    } catch (error) {
      console.warn(`Warning: Could not process image ${image.src}:`, error);
    }
  }

  // Copy cover image if provided
  if (metadata.cover) {
    try {
      const coverDest = path.join(tempDir, 'OEBPS', 'images', 'cover' + path.extname(metadata.cover));
      await fs.promises.copyFile(metadata.cover, coverDest);
    } catch (error) {
      console.warn(`Warning: Could not copy cover image:`, error);
    }
  }
}

/**
 * Create EPUB directory structure for multi-chapter book
 */
async function createMultiChapterEpubStructure(
  tempDir: string,
  chapters: Chapter[],
  metadata: EpubMetadata,
  images: ImageReference[]
): Promise<void> {
  // Create directory structure
  await fs.promises.mkdir(tempDir, { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'images'), { recursive: true });
  await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'css'), { recursive: true });

  // Create mimetype file (must be first and uncompressed)
  await fs.promises.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf-8');

  // Create META-INF/container.xml
  await fs.promises.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    getContainerXml(),
    'utf-8'
  );

  // Create content.opf
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    getMultiChapterContentOpf(metadata, images, chapters),
    'utf-8'
  );

  // Create toc.ncx
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'toc.ncx'),
    getMultiChapterTocNcx(metadata, chapters),
    'utf-8'
  );

  // Create chapter XHTML files
  for (const chapter of chapters) {
    await fs.promises.writeFile(
      path.join(tempDir, 'OEBPS', `${chapter.id}.xhtml`),
      getContentXhtml(chapter.html, chapter.title),
      'utf-8'
    );
  }

  // Create stylesheet
  await fs.promises.writeFile(
    path.join(tempDir, 'OEBPS', 'css', 'style.css'),
    getEpubCSS(),
    'utf-8'
  );

  // Copy or download images
  for (const image of images) {
    try {
      const destPath = path.join(tempDir, 'OEBPS', 'images', path.basename(image.src));

      if (image.resolvedPath.startsWith('http://') || image.resolvedPath.startsWith('https://')) {
        // Download remote image
        console.log(`Downloading image: ${image.src}`);
        await downloadImage(image.resolvedPath, destPath);
      } else {
        // Copy local image
        await fs.promises.copyFile(image.resolvedPath, destPath);
      }
    } catch (error) {
      console.warn(`Warning: Could not process image ${image.src}:`, error);
    }
  }

  // Copy cover image if provided
  if (metadata.cover) {
    try {
      const coverDest = path.join(tempDir, 'OEBPS', 'images', 'cover' + path.extname(metadata.cover));
      await fs.promises.copyFile(metadata.cover, coverDest);
    } catch (error) {
      console.warn(`Warning: Could not copy cover image:`, error);
    }
  }
}

/**
 * Create EPUB archive (ZIP file)
 */
async function createEpubArchive(tempDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    output.on('close', () => resolve());
    archive.on('error', (err: Error) => reject(err));

    archive.pipe(output);

    // Add mimetype first (uncompressed and first in archive)
    // The mimetype file must be uncompressed for EPUB spec compliance
    archive.append(fs.createReadStream(path.join(tempDir, 'mimetype')), {
      name: 'mimetype',
    });

    // Add other files
    archive.directory(path.join(tempDir, 'META-INF'), 'META-INF');
    archive.directory(path.join(tempDir, 'OEBPS'), 'OEBPS');

    archive.finalize();
  });
}

/**
 * Generate container.xml content
 */
function getContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

/**
 * Generate content.opf (package document)
 */
function getContentOpf(metadata: EpubMetadata, images: ImageReference[]): string {
  const imageManifest = images
    .map(
      (img, idx) =>
        `    <item id="image-${idx}" href="images/${path.basename(img.src)}" media-type="${img.mediaType}"/>`
    )
    .join('\n');

  const coverItem = metadata.cover
    ? `    <item id="cover-image" href="images/cover${path.extname(metadata.cover)}" media-type="image/jpeg"/>\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="${metadata.language}" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${metadata.identifier}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:language>${metadata.language}</dc:language>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    ${metadata.publisher ? `<dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>` : ''}
    ${metadata.description ? `<dc:description>${escapeXml(metadata.description)}</dc:description>` : ''}
    ${metadata.rights ? `<dc:rights>${escapeXml(metadata.rights)}</dc:rights>` : ''}
    <dc:date>${metadata.createdDate}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().split('T')[0]}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="css/style.css" media-type="text/css"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
${coverItem}${imageManifest}
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;
}

/**
 * Generate toc.ncx (navigation control file)
 */
function getTocNcx(metadata: EpubMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(metadata.title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel>
        <text>${escapeXml(metadata.title)}</text>
      </navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
}

/**
 * Generate content.opf for multi-chapter book
 */
function getMultiChapterContentOpf(metadata: EpubMetadata, images: ImageReference[], chapters: Chapter[]): string {
  const imageManifest = images
    .map(
      (img, idx) =>
        `    <item id="image-${idx}" href="images/${path.basename(img.src)}" media-type="${img.mediaType}"/>`
    )
    .join('\n');

  const coverItem = metadata.cover
    ? `    <item id="cover-image" href="images/cover${path.extname(metadata.cover)}" media-type="image/jpeg"/>\n`
    : '';

  const chapterManifest = chapters
    .map(
      (chapter) =>
        `    <item id="${chapter.id}" href="${chapter.id}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join('\n');

  const chapterSpine = chapters
    .map((chapter) => `    <itemref idref="${chapter.id}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="${metadata.language}" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${metadata.identifier}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:language>${metadata.language}</dc:language>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    ${metadata.publisher ? `<dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>` : ''}
    ${metadata.description ? `<dc:description>${escapeXml(metadata.description)}</dc:description>` : ''}
    ${metadata.rights ? `<dc:rights>${escapeXml(metadata.rights)}</dc:rights>` : ''}
    <dc:date>${metadata.createdDate}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().split('T')[0]}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="css/style.css" media-type="text/css"/>
${chapterManifest}
${coverItem}${imageManifest}
  </manifest>
  <spine toc="ncx">
${chapterSpine}
  </spine>
</package>`;
}

/**
 * Generate toc.ncx for multi-chapter book
 */
function getMultiChapterTocNcx(metadata: EpubMetadata, chapters: Chapter[]): string {
  const navPoints = chapters
    .map(
      (chapter, idx) => `    <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel>
        <text>${escapeXml(chapter.title)}</text>
      </navLabel>
      <content src="${chapter.id}.xhtml"/>
    </navPoint>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(metadata.title)}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

/**
 * Generate content.xhtml
 */
function getContentXhtml(htmlContent: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
