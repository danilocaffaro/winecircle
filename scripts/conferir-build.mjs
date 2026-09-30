// Asseercoes de build. Mesmas checagens do job `build` em .github/workflows/ci.yml,
// para que o portao local e o CI nunca divirjam. Rode a partir de app/.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const dist = 'dist'
const falhas = []

if (!existsSync(join(dist, 'index.html'))) falhas.push('build sem index.html')

// O service worker ja foi entregue como TypeScript uma vez e falhou em toda visita.
if (!existsSync(join(dist, 'sw.js'))) falhas.push('build sem sw.js')
if (existsSync(join(dist, 'sw.js'))) {
  try {
    execFileSync(process.execPath, ['--check', join(dist, 'sw.js')], { stdio: 'pipe' })
  } catch {
    falhas.push('sw.js nao e JavaScript valido')
  }
}

// A chave do Gemini nao pode voltar para o bundle.
const arquivos = []
const andar = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) andar(p)
    else arquivos.push(p)
  }
}
if (existsSync(dist)) andar(dist)
if (arquivos.some((f) => /AIzaSy[A-Za-z0-9_-]{20,}/.test(readFileSync(f, 'utf8')))) {
  falhas.push('chave de API encontrada no bundle')
}

const fontBytes = arquivos.filter((f) => f.endsWith('.woff2')).reduce((n, f) => n + statSync(f).size, 0)
if (fontBytes > 100_000) falhas.push(`fontes acima de 100 KB: ${fontBytes} bytes`)
const sources = []
const readSources = (directory) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) readSources(path)
    else if (/\.(css|tsx|ts)$/.test(name)) sources.push(readFileSync(path, 'utf8'))
  }
}
readSources('src')
const source = sources.join('\n')
const definitions = new Set([...source.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((m) => m[1]))
for (const match of source.matchAll(/var\((--[a-zA-Z0-9_-]+)\s*\)/g)) {
  if (!definitions.has(match[1])) falhas.push(`token sem definição: ${match[1]}`)
}
if (falhas.length) {
  for (const f of falhas) console.error(`ERRO: ${f}`)
  process.exit(1)
}
console.log(`build OK (${arquivos.length} arquivos)`)
