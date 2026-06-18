import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join, relative, dirname, basename, extname, resolve } from 'path'
import { createHash } from 'crypto'

const srcDir = resolve(import.meta.dirname, '../spa/src')

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = [], dirs = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) { dirs.push(full); const r = walk(full); files.push(...r.files); dirs.push(...r.dirs) }
    else if (e.isFile()) files.push(full)
  }
  return { files, dirs }
}

const { files, dirs } = walk(srcDir)

function hashName(name) {
  return createHash('md5').update(name.toLowerCase()).digest('hex').slice(0, 6)
}

// Collect all unique component names (skip 'index' for files)
const allComponents = new Set()
for (const p of [...files, ...dirs]) {
  const parts = relative(srcDir, p).split(/[\\/]/)
  for (const part of parts) {
    if (!part) continue
    const key = extname(part) ? basename(part, extname(part)) : part
    // Skip 'index' for files — they keep their name for directory-style resolution
    if (extname(part) && key === 'index') continue
    allComponents.add(key)
  }
}

// Generate unique hashes
const componentMap = new Map()
const used = new Set()
for (const name of allComponents) {
  let h = hashName(name)
  let counter = 0
  while (used.has(h)) { counter++; h = hashName(name + counter) }
  componentMap.set(name, h)
  used.add(h)
}

// Manually assign known names with context (directory names keep being what they are)
console.log('Component hashes:')
for (const [name, h] of componentMap) {
  console.log(`  ${name} -> ${h}`)
}

function computeFinalPath(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/')
  const result = []
  for (const part of parts) {
    if (!part) continue
    const key = extname(part) ? basename(part, extname(part)) : part
    const ext = extname(part)
    // Keep 'index' names unchanged for directory resolution
    if (ext && key === 'index') {
      result.push(`index${ext}`)
    } else {
      const h = componentMap.get(key)
      if (!h) { console.error(`ERROR: no hash for "${key}" from "${relPath}"`); process.exit(1) }
      result.push(h + ext)
    }
  }
  return result.join('/')
}

// ========== PHASE 1: Read ==========
console.log('\n=== PHASE 1: Reading all files ===')
const fileStore = new Map()
for (const fp of files) {
  const rel = relative(srcDir, fp).replace(/\\/g, '/')
  fileStore.set(rel, readFileSync(fp, 'utf-8'))
}

// ========== PHASE 2: Build import map ==========
console.log('\n=== PHASE 2: Building import map ===')
const importMap = new Map()
for (const [rel] of fileStore) {
  const newRel = computeFinalPath(rel)
  // Store both with and without extension for lookup flexibility
  const oldFull = rel.replace(/\\/g, '/')
  const newFull = newRel.replace(/\\/g, '/')
  if (oldFull !== newFull) importMap.set(oldFull, newFull)
  // Also store without extension (for imports that omit extension)
  const oldNoExt = rel.replace(/\.[^.]+$/, '')
  const newNoExt = newRel.replace(/\.[^.]+$/, '')
  if (oldNoExt !== newNoExt) importMap.set(oldNoExt, newNoExt)
}
// Add directory-style entries for index files
for (const [rel] of fileStore) {
  const base = basename(rel, extname(rel))
  if (base === 'index') {
    const dir = dirname(rel).replace(/\\/g, '/')
    const newRel = computeFinalPath(rel)
    const newDir = dirname(newRel)
    importMap.set(dir, newDir)
    console.log(`  Dir import: @/${dir}  =>  @/${newDir}`)
  }
}

const dirImportMap = new Map()
for (const dp of dirs) {
  const rel = relative(srcDir, dp).replace(/\\/g, '/')
  const newRel = computeFinalPath(rel)
  if (rel !== newRel) dirImportMap.set(rel, newRel)
}

// ========== PHASE 3: Update imports ==========
console.log('\n=== PHASE 3: Updating imports ===')
for (const [rel, content] of fileStore) {
  let updated = content
  const oldDir = dirname(rel).replace(/\\/g, '/')
  const newDir = dirImportMap.get(oldDir) || oldDir

  // Static imports: from/import/export with @/
  updated = updated.replace(/((?:from|import(?:\s+type)?|export(?:\s*\{[^}]+\s*from)?)\s+['"])@\/([^'"]+)(['"])/g, (match, pre, p, suf) => {
    const r = importMap.get(p)
    return r ? `${pre}@/${r}${suf}` : match
  })

  // Dynamic imports: import('@/...')
  updated = updated.replace(/import\(['"]@\/([^'"]+)['"]\)/g, (match, p) => {
    const r = importMap.get(p)
    return r ? `import('@/${r}')` : match
  })

  // Relative imports
  updated = updated.replace(/from\s+['"](\..+?)['"]/g, (match, relImport) => {
    const resolved = resolve(join(srcDir, oldDir, relImport)).replace(/\\/g, '/')
    const absPrefix = srcDir.replace(/\\/g, '/') + '/'
    if (!resolved.startsWith(absPrefix)) return match
    const resolvedRel = resolved.slice(absPrefix.length)
    const resolvedNoExt = resolvedRel.replace(/\.[^.]+$/, '')
    const mapped = importMap.get(resolvedRel) || importMap.get(resolvedNoExt)
    if (!mapped) return match

    const mappedDir = dirname(mapped)
    const mappedBase = basename(mapped)
    let newRelPath = relative(newDir, mappedDir).replace(/\\/g, '/')
    if (newRelPath === '') newRelPath = '.'
    if (!newRelPath.startsWith('.')) newRelPath = './' + newRelPath
    return `from '${newRelPath}/${mappedBase}'`
  })

  fileStore.set(rel, updated)
  if (updated !== content) console.log(`  Updated: ${rel}`)
}

// ========== PHASE 4: Write ==========
console.log('\n=== PHASE 4: Writing files ===')
for (const [rel, content] of fileStore) {
  const newRel = computeFinalPath(rel)
  const newPath = join(srcDir, newRel)
  const parent = dirname(newPath)
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true })
  writeFileSync(newPath, content, 'utf-8')
  console.log(`  Written: ${newRel}`)
}

// ========== PHASE 5: Remove old files ==========
console.log('\n=== PHASE 5: Removing old files ===')
for (const [rel] of fileStore) {
  const newRel = computeFinalPath(rel)
  if (rel !== newRel) {
    const oldPath = join(srcDir, rel)
    try { rmSync(oldPath, { force: true }); console.log(`  Removed: ${rel}`) } catch {}
  }
}

// ========== PHASE 6: Clean empty dirs ==========
console.log('\n=== PHASE 6: Cleaning directories ===')
const dirList = [...dirs].sort((a, b) => b.split(/[\\/]/).length - a.split(/[\\/]/).length)
for (const dp of dirList) {
  const rel = relative(srcDir, dp).replace(/\\/g, '/')
  const newRel = computeFinalPath(rel)
  if (rel === newRel) continue
  try {
    const entries = readdirSync(dp)
    if (entries.length === 0) { rmSync(dp, { recursive: true, force: true }); console.log(`  Removed dir: ${rel}`) }
  } catch {}
}

console.log('\n=== FINAL IMPORT MAP ===')
for (const [old, nw] of importMap) {
  if (old !== nw) console.log(`  @/${old}  =>  @/${nw}`)
}

console.log('\nDone!')
