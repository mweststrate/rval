const fs = require('fs')
const child_process = require('child_process')
const os = require('os')

const binFolder = child_process
  .execSync('yarn bin')
  .toString()
  .replace(/(\s+$)/g, '')

const basePath = __dirname + "/../"

const projects = fs.readdirSync(basePath + 'pkgs/')

projects.forEach(pkg => {
  child_process.execSync("yarn link", {
    cwd: basePath + 'pkgs/' + pkg,
    stdio: [0, 1, 2],
  })
})

const examples = fs.readdirSync(basePath + "examples/")

examples.forEach(pkg => {
  pkgJson = JSON.parse(fs.readFileSync(basePath + "examples/" + pkg + "/package.json"))
  Object.keys(pkgJson.dependencies)
    .filter(dep => dep.startsWith("@r-val/"))
    .forEach(dep => {
      child_process.execSync("yarn link " + dep, {
        cwd: basePath + 'examples/' + pkg,
        stdio: [0, 1, 2],
      })
    })
})
