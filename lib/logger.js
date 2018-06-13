module.exports = {
  trace : (str, shouldLineBreak) => {
    console.log(chalk.gray(str + (shouldLineBreak ? '\n' : '')))
  },
  info : (str, shouldLineBreak) => {
    console.log(chalk.cyan('\n> ' + str + (shouldLineBreak ? '' : '\n')))
  },
  warn : (str, shouldLineBreak) => {
    console.log(chalk.yellow(str + (shouldLineBreak ? '\n' : '')))
  },
  error : (str) => {
    console.log(chalk.red('[ERROR]: ' + str + '\n'))
  }
}
