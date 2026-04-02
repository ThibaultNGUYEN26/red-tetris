import { DefaultReporter } from 'vitest/reporters'
import { getSuites, getTests } from '@vitest/runner/utils'
import c from 'tinyrainbow'

class CompactReporter extends DefaultReporter {
  onTestModuleEnd() {
    // Skip per-file test output; keep only the summary block.
  }

  onUserConsoleLog() {
    // Suppress test stdout/stderr noise.
  }

  reportSummary(files, errors) {
    this.printFileDurations(files)
    super.reportSummary(files, errors)
  }

  printFileDurations(files) {
    if (!files.length) return
    this.log()
    this.log('Test Files')
    files.forEach((file) => {
      const filepath = file.filepath || file.name
      const duration = Math.round(file.result?.duration ?? 0)
      const label = file.filepath ? this.relative(filepath) : filepath
      const state = file.result?.state || (file.mode === 'skip' ? 'skip' : 'unknown')
      const status = this.formatStatus(state)
      this.log(`  ${status} ${label} ${this.formatDuration(duration)}`)
    })
    this.log()
  }

  printErrorsSummary(files, errors) {
    const suites = getSuites(files).filter((i) => i.result?.errors?.length)
    const tests = getTests(files).filter((i) => i.result?.state === 'fail')
    if (!suites.length && !tests.length && !errors.length) return

    this.error()

    suites.forEach((suite) => {
      const message = this.formatErrorMessage(suite)
      this.error(`FAIL ${suite.name}: ${message}`)
    })

    tests.forEach((test) => {
      const message = this.formatErrorMessage(test)
      const name = this.getFullName(test, ' > ')
      this.error(`FAIL ${name}: ${message}`)
    })

    errors.forEach((err) => {
      const message = this.formatUnhandledError(err)
      this.error(`ERROR ${message}`)
    })

    this.error()
  }

  formatErrorMessage(task) {
    const raw = task.result?.errors?.[0]?.message ?? 'Unknown error'
    return String(raw).split('\n')[0].trim()
  }

  formatUnhandledError(error) {
    const raw = error?.message || error
    return String(raw).split('\n')[0].trim()
  }

  formatStatus(state) {
    switch (state) {
      case 'pass':
        return c.green('PASS')
      case 'fail':
        return c.red('FAIL')
      case 'skip':
        return c.yellow('SKIP')
      default:
        return c.dim('INFO')
    }
  }

  formatDuration(duration) {
    return c.green(`${duration}${c.dim('ms')}`)
  }
}

export default CompactReporter
