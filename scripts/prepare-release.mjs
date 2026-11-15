import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { posix, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(root, 'public');
const outputRoot = join(root, 'dist-release');
const defaultMaxAssetBytes = 25 * 1024 * 1024;
// Vercel Hobby static-file upload limit: 100 MB (https://vercel.com/docs/limits).
const deploymentFileLimitBytes = 100 * 1000 * 1000;
const programmeErizonProvenance = JSON.parse(
  await readFile(join(root, 'src/data/programmeErizonProvenance.json'), 'utf8')
);

// The only supplied media cleared for the public release. The exact byte size and
// SHA-256 are checked so the original, unmodified file is the only model emitted.
const runtimeAssets = [
  {
    path: programmeErizonProvenance.modelPath,
    bytes: programmeErizonProvenance.bytes,
    sha256: programmeErizonProvenance.sha256,
  },
];
const runtimeAssetByPath = new Map(runtimeAssets.map((asset) => [asset.path, asset]));
const excludedLocalAssetPattern = /(?:^|\/)(?:programme[_-]?erizon|sci-fi_space_station|need_some_space)[^/]*\.(?:glb|gltf|mp4|webm)$/i;

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function copyAllowlistedAssets() {
  for (const asset of runtimeAssets) {
    const source = join(publicRoot, asset.path);
    const sourceSize = (await stat(source)).size;
    if (sourceSize !== asset.bytes) {
      throw new Error(
        `Programme ERIZON source size changed: expected ${asset.bytes}, found ${sourceSize}`
      );
    }
    const sourceHash = await sha256(source);
    if (sourceHash !== asset.sha256) {
      throw new Error('Programme ERIZON source SHA-256 does not match the recorded provenance');
    }

    const destination = join(outputRoot, asset.path);
    await mkdir(join(destination, '..'), { recursive: true });
    await copyFile(source, destination);
  }
}

async function listFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

// The previously deployed vendor split emitted mutually importing React/scheduler
// chunks; that cycle threw before React mounted and left the page blank.
function verifyNoCyclicStaticChunks(sources) {
  const staticImport = /(?:from|import)\s*["']\.\/([^"']+)["']/g;
  const graph = new Map();
  for (const [path, source] of sources) {
    const dependencies = new Set();
    for (const match of source.matchAll(staticImport)) {
      const target = posix.normalize(posix.join(posix.dirname(path), match[1]));
      if (sources.has(target)) dependencies.add(target);
    }
    graph.set(path, [...dependencies]);
  }

  const visited = new Set();
  const visiting = new Set();
  const stack = [];
  const visit = (path) => {
    if (visited.has(path)) return;
    if (visiting.has(path)) {
      const cycle = [...stack.slice(stack.indexOf(path)), path].join(' -> ');
      throw new Error(`Circular static chunk imports would break module initialization: ${cycle}`);
    }
    visiting.add(path);
    stack.push(path);
    for (const dependency of graph.get(path) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(path);
    visited.add(path);
  };
  for (const path of graph.keys()) visit(path);
}

async function verifyArtifact() {
  const files = await listFiles(outputRoot);
  const relativePaths = files.map((file) => relative(outputRoot, file).split(sep).join('/'));
  const pathSet = new Set(relativePaths);
  for (const asset of runtimeAssets) {
    if (!pathSet.has(asset.path)) throw new Error(`Required release asset missing: ${asset.path}`);
  }
  for (const path of relativePaths) {
    const allowedAsset = runtimeAssetByPath.get(path);
    if (excludedLocalAssetPattern.test(path) && !allowedAsset) {
      throw new Error(`Excluded local-only asset found in release: ${path}`);
    }
    const size = (await stat(join(outputRoot, path))).size;
    if (size > deploymentFileLimitBytes) {
      throw new Error(
        `Release file exceeds the Vercel Hobby static-file limit: ${path} (${size} bytes)`
      );
    }
    if (!allowedAsset && size > defaultMaxAssetBytes) {
      throw new Error(`Release asset exceeds the ${defaultMaxAssetBytes}-byte safety limit: ${path} (${size} bytes)`);
    }
    if (allowedAsset && size !== allowedAsset.bytes) {
      throw new Error(`Release asset size changed: ${path} (${size} bytes)`);
    }
    if (!/\.(?:html|js|css)$/i.test(path) && !allowedAsset) {
      throw new Error(`Unexpected non-code release file (only HTML/JS/CSS plus the allowlisted model are allowed): ${path}`);
    }
    if (allowedAsset && (await sha256(join(outputRoot, path))) !== allowedAsset.sha256) {
      throw new Error(`Release asset SHA-256 does not match provenance: ${path}`);
    }
  }

  const jsFiles = files.filter((file) => file.endsWith('.js'));
  const jsSources = new Map();
  for (const file of jsFiles) {
    jsSources.set(relative(outputRoot, file).split(sep).join('/'), await readFile(file, 'utf8'));
  }
  const bundledJs = [...jsSources.values()].join('\n');
  if (!/C001_serum_L-3/.test(bundledJs)) {
    throw new Error('NASA OSD-575 sample marker not found in bundled JavaScript');
  }
  if (/models\/(?:astronaut|brain|heart|lungs|need_some_space|sci-fi_space_station)\.glb|videos\/dashboard-background\.mp4/i.test(bundledJs)) {
    throw new Error('Release JavaScript references an uncleared local model, video, or poster asset');
  }
  if (!bundledJs.includes(programmeErizonProvenance.modelPath)) {
    throw new Error('Release JavaScript does not reference the approved Programme ERIZON model');
  }
  if (!bundledJs.includes(programmeErizonProvenance.title) || !bundledJs.includes(programmeErizonProvenance.licenseShortName)) {
    throw new Error('Programme ERIZON attribution metadata is missing from release JavaScript');
  }
  if (!bundledJs.includes('Static CSS background')) {
    throw new Error('Intentional static CSS backdrop label missing from release JavaScript');
  }
  if (!bundledJs.includes('radial-gradient')) {
    throw new Error('Original CSS starfield fallback missing from release JavaScript');
  }
  if (!bundledJs.includes('Interactive 3D astronaut preview')) {
    throw new Error('Procedural astronaut preview fallback missing from release JavaScript');
  }
  if (!bundledJs.includes('Illustrative procedural spacecraft')) {
    throw new Error('Intentional procedural spacecraft fallback missing from release JavaScript');
  }
  verifyNoCyclicStaticChunks(jsSources);

  const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size)))
    .reduce((sum, size) => sum + size, 0);
  console.log(`Release artifact verified: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB total.`);
  console.log(
    `Programme ERIZON: ${programmeErizonProvenance.bytes} bytes, SHA-256 verified; below the ${deploymentFileLimitBytes}-byte Vercel Hobby static-file limit.`
  );
  console.log(
    `All other files are at or below ${defaultMaxAssetBytes} bytes; ${runtimeAssets.length} runtime public asset copied from the allowlist.`
  );
}

await copyAllowlistedAssets();
await verifyArtifact();
