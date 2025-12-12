# Image Embedding Demo

This document demonstrates the **md-to-epub** tool's ability to embed both local and remote images in EPUB files.

## Local Images

Local images are copied from the filesystem and embedded:

![Local Markdown Logo](images/markdown-logo.png)

This image is stored locally in the `examples/images/` folder and will be embedded in the EPUB.

## Remote Images

Images from the web are automatically downloaded and embedded:

![Remote Wikipedia Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/200px-Wikipedia-logo-v2.svg.png)

The tool automatically detects HTTP/HTTPS URLs and downloads the images during EPUB generation.

## Features

Both types of images work seamlessly:

- **Remote images** are downloaded automatically
- **Local images** are copied from filesystem
- All images are embedded directly in the EPUB
- No external dependencies when reading the EPUB

## Technical Details

The converter:

1. Parses the markdown file
2. Identifies all image references
3. Downloads remote images (http://, https://)
4. Copies local images (file paths)
5. Embeds all images in the EPUB archive
6. Updates references to point to embedded copies

This ensures your EPUB is completely self-contained and can be read offline on any e-reader device.

---

*This example demonstrates remote image embedding - all images visible in the EPUB were fetched from the internet and embedded during conversion.*
