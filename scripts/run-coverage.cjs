const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')

function runCommand(command, args, cwd) {
  const isWindows = process.platform === 'win32'
  const result = isWindows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', command, ...args], {
        cwd,
        stdio: 'inherit',
        shell: false,
      })
    : spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        shell: false,
      })

  if (result.error) {
    throw result.error
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }
}

function readSummary(summaryPath) {
  const raw = fs.readFileSync(summaryPath, 'utf8')
  const parsed = JSON.parse(raw)
  return parsed.total
}

function formatPercent(metric) {
  return `${metric.pct}%`
}

function printSummary(label, summary) {
  console.log(`${label}:`)
  console.log(`Statements ${formatPercent(summary.statements)}`)
  console.log(`Branches ${formatPercent(summary.branches)}`)
  console.log(`Functions ${formatPercent(summary.functions)}`)
  console.log(`Lines ${formatPercent(summary.lines)}`)
}

runCommand('npm.cmd', ['--prefix', 'backend', 'run', 'test:coverage'], rootDir)
runCommand('npm.cmd', ['--prefix', 'frontend', 'run', 'test:coverage'], rootDir)

const backendSummary = readSummary(
  path.join(rootDir, 'backend', 'coverage', 'coverage-summary.json')
)
const frontendSummary = readSummary(
  path.join(rootDir, 'frontend', 'coverage', 'coverage-summary.json')
)

console.log('')
printSummary('Backend', backendSummary)
console.log('')
printSummary('Frontend', frontendSummary)
