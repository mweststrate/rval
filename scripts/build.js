const fs = require('fs')
const child_process = require('child_process')
const os = require('os')

const binFolder = child_process
  .execSync('yarn bin')
  .toString()
  .replace(/(\s+$)/g, '')
const microbundle = binFolder + '/microbundle'

const projects = fs.readdirSync('pkgs/')
const packageJson = fs.readFileSync('scripts/package-template.json', 'utf8')

const buildCommand =
  microbundle +
  ' --compress --source-map --entry $pkg.ts --name rval_$pkg --strict --format es,cjs,umd --globals ' +
  projects.map(pkg => '@r-val/' + pkg + '=rval_' + pkg).join(',') + 
  ' --external ' + projects.map(pkg => '@r-val/' + pkg).join(',') + 
  ' && mv dist/$pkg/*.d.ts dist/ ' +
  ' && rimraf dist/$pkg .rts2* mangle.json'

const corePkgJson = JSON.parse(fs.readFileSync(__dirname + '/../pkgs/core/package.json', 'utf8'))

projects.forEach(pkg => {
  const pkgJson = JSON.parse(fs.readFileSync(__dirname + '/../pkgs/' + pkg + '/package.json', 'utf8'))
  const newProps = packageJson.replace(/\$pkg/g, pkg)

  const newPkgJson = Object.assign(
    pkgJson,
    JSON.parse(newProps),
    // If reserved is set, mangle all the property names!
    Array.isArray(pkgJson.reserved)
      ? // property names as defined in core shouldn't be mangled either
        {
          mangle: {
            reserved: Array.from(new Set([...corePkgJson.reserved, ...pkgJson.reserved])),
          },
        }
      : {}
  )

  fs.writeFileSync(__dirname + '/../pkgs/' + pkg + '/package.json', JSON.stringify(newPkgJson, null, '  '), 'utf8')
  const command = buildCommand.replace(/\$pkg/g, pkg)
  console.log('Running ' + command)
  child_process.execSync(command, {
    cwd: __dirname + '/../pkgs/' + pkg,
    stdio: [0, 1, 2],
  })
})
