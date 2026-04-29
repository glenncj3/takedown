import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const imagesDir = path.resolve(process.cwd(), 'public', 'images');

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch {}
}

async function collectPngFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectPngFiles(p)));
    } else if (entry.isFile() && /\.png$/i.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function convertOne(pngPath, force = false) {
  const dir = path.dirname(pngPath);
  const base = path.basename(pngPath, path.extname(pngPath));
  const webpPath = path.join(dir, `${base}.webp`);
  const avifPath = path.join(dir, `${base}.avif`);

  try {
    const img = sharp(pngPath);

    if (force || !(await fileExists(webpPath))) {
      await img.clone().webp({ quality: 82 }).toFile(webpPath);
      console.log('Created', path.relative(process.cwd(), webpPath));
    } else {
      console.log('Skipped (exists)', path.relative(process.cwd(), webpPath));
    }

    if (force || !(await fileExists(avifPath))) {
      await img.clone().avif({ quality: 50 }).toFile(avifPath);
      console.log('Created', path.relative(process.cwd(), avifPath));
    } else {
      console.log('Skipped (exists)', path.relative(process.cwd(), avifPath));
    }
  } catch (error) {
    console.error(
      `Error converting ${path.relative(process.cwd(), pngPath)}:`,
      error.message,
    );
    throw error;
  }
}

async function main() {
  await ensureDir(imagesDir);
  let files = await collectPngFiles(imagesDir);

  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const specificFiles = args.filter(
    (arg) => !arg.startsWith('--') && !arg.startsWith('-'),
  );

  if (specificFiles.length > 0) {
    files = files.filter((f) => {
      const base = path.basename(f, path.extname(f));
      return specificFiles.some(
        (name) => base === name || base === name.replace(/\.png$/i, ''),
      );
    });
  }

  console.log(`Converting ${files.length} PNG file(s) in ${imagesDir}...`);

  let successCount = 0;
  let errorCount = 0;

  for (const f of files) {
    try {
      await convertOne(f, force);
      successCount++;
    } catch {
      errorCount++;
    }
  }

  console.log(
    `Done. ${successCount} files processed successfully, ${errorCount} errors.`,
  );

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
