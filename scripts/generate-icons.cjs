const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '..', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons')
const outFile = path.join(__dirname, '..', 'src', 'lib', 'icons.generated.jsx')

function pascalCase(name) {
  return name
    .replace(/(^.|[-_].)/g, (s) => s.replace(/[-_]/, '').toUpperCase())
}

function extractIconNode(content) {
  const re = /(?:export\s+)?const __iconNode[\s\S]*?=\s*(\[[\s\S]*?\]);/m
  const m = content.match(re)
  if (!m) return null
  return m[1]
}

function resolveReexport(content) {
  // Extract re-export: export { default } from './chart-no-axes-column.mjs';
  const re = /export\s*{\s*default\s*}\s*from\s*['"]([^'"]+)['"]/
  const m = content.match(re)
  if (!m) return null
  const importPath = m[1]
  const baseName = path.basename(importPath, '.mjs')
  return baseName
}

function writeFile(contents) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, contents, 'utf8')
}

const files = fs.existsSync(iconsDir)
  ? fs.readdirSync(iconsDir).filter((f) => f.endsWith('.mjs'))
  : []

const entries = []
const reexports = [] // Track aliases: [fromName, toName]

for (const file of files) {
  const name = path.basename(file, '.mjs') // e.g., layout-grid
  const pascal = pascalCase(name)
  const content = fs.readFileSync(path.join(iconsDir, file), 'utf8')
  let nodeText = extractIconNode(content)
  
  // If no __iconNode found, check if it's a re-export
  if (!nodeText) {
    const targetName = resolveReexport(content)
    if (targetName && targetName !== name) {  // Only create alias if it's not self-referential
      reexports.push([name, targetName])
    }
    continue
  }

  // Evaluate the array literal to turn into JS structure
  let nodeVal
  try {
    // Wrap in parentheses to allow top-level array
    nodeVal = eval('(' + nodeText + ')')
  } catch (err) {
    console.warn('skip', name, err.message)
    continue
  }

  // Build JSX children
  const children = nodeVal
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs || {})
        .map(([k, v]) => {
          return `${k}={${JSON.stringify(v)}}`
        })
        .join(' ')
      return `    <${tag} ${props} />`
    })
    .join('\n')

  const component = `export const ${pascal} = ({ size = 24, strokeWidth = 2, color = 'currentColor', strokeLinecap = 'round', strokeLinejoin = 'round', className, ...props }) => (\n  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} className={className} {...props}>\n${children}\n  </svg>\n)\n`

  entries.push({ name: pascal, component })
}

if (entries.length === 0) {
  console.error('No icons generated: icons directory missing or parser failed.')
  process.exit(1)
}

const entryNames = new Set(entries.map((e) => e.name))

const header = `/* THIS FILE IS GENERATED - DO NOT EDIT DIRECTLY */\nimport React from 'react'\n\n`

const componentsCode = entries.map((e) => e.component).join('\n')

// Build aliases for re-exports, excluding any that collide with existing components
const aliasesCode = reexports
  .filter(([fromName, toName]) => {
    const fromPascal = pascalCase(fromName)
    const toPascal = pascalCase(toName)
    // Skip if source name collides with an existing component
    return fromPascal !== toPascal && !entryNames.has(fromPascal)
  })
  .map(([fromName, toName]) => {
    const fromPascal = pascalCase(fromName)
    const toPascal = pascalCase(toName)
    return `export const ${fromPascal} = ${toPascal}`
  })
  .join('\n')

const validAliases = reexports.filter(([fromName, toName]) => {
  const fromPascal = pascalCase(fromName)
  const toPascal = pascalCase(toName)
  return fromPascal !== toPascal && !entryNames.has(fromPascal)
})

const namedExports = '\nexport default {' + entries.map((e) => ` ${e.name}`).join(',') + validAliases.map(([name]) => `, ${pascalCase(name)}`).join('') + ' }\n'

writeFile(header + componentsCode + (aliasesCode ? '\n' + aliasesCode : '') + namedExports)

console.log('Wrote', outFile, 'with', entries.length, 'icons and', validAliases.length, 'aliases')
