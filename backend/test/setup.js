const originalConsoleError = console.error

console.log = () => {}
console.info = () => {}
console.debug = () => {}
console.error = (...args) => {
  const message = args.map(String).join(' ')
  if (
    message.includes('Missing data:') ||
    message.includes('User already in a room:')
  ) {
    return
  }
  originalConsoleError(...args)
}
