#!/usr/bin/env node

const readline = require('readline')
const dbName = process.argv[2]

if (!dbName) {
  console.log("Usage: sqlite db_name")
  process.exit()
}

const db = require('better-sqlite3')(dbName, {})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
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
      case !!stmt.match(/^\s*(select|pragma)/g):
        break
      case !!stmt.match(/^\s*(insert|create|delete|alter)/g):
        func = 'run'
        break
      default:
        throw new Error('Unknown statement type!')
        break
    }
    const result = db.prepare(stmt)[func]()
    console.table(func === 'run' ? [result] : result)
    console.log(` Found ${result.length} results\n`)
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
  rl.prompt()
});

rl.prompt()