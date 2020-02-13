#!/usr/bin/env node

const readline = require('readline')

var argv = require('yargs')
    .usage('Usage: $0 <db_path> [options]')
    .command('db_path', 'Path to database')
    .demandCommand(1)
    .example('$0 foo.db --json', '')
    .option('json', {
      alias: 'j',
      type: 'boolean',
      description: 'json output'
    })
    .argv

const db_path = argv._[0]
const db = require('better-sqlite3')(db_path, {})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdin.isTTY ? process.stdout : null,
  terminal: process.stdin.isTTY,
  prompt: 'sqlite> ',
  completer: (line) => {
    const completions = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
    const match = line.match(/\S*$/)[0]
    const hits = completions.filter((c) => c.startsWith(match));
    return [hits.length ? hits : completions, match];
  }
});

let buffer = ""
const exec = (stmt) => {
  try {
    let func = 'all'
    switch(true){
      case !!stmt.match(/^\s*(select|pragma)/i):
        break
      case !!stmt.match(/^\s*(insert|create|delete|alter|drop)/i):
        func = 'run'
        break
      default:
        throw new Error('Unknown statement type!')
        break
    }
    const result = db.prepare(stmt)[func]()
    if(argv.json){
      console.log(JSON.stringify(result))
    } else {
      console.table(func === 'run' ? [result] : result)
      console.log(` Found ${result.length} results\n`)
    }
  } catch (e) {
    console.log("Error: " + e.message)
  }
}

rl.on('line', (input) => {
  const tokens = input.split(/(?<=;)/)
  for(let token of tokens){
    buffer = [buffer, token].join(" ")
    if(buffer.match(';')){
      exec(buffer)
      buffer = ""
    }
  }
  rl.setPrompt(buffer.match(/\S/) ? 'sqlite>*' : 'sqlite> ')
  if(process.stdin.isTTY) rl.prompt()
});

if(process.stdin.isTTY) rl.prompt()