const fs = require('fs')
const child_process = require('child_process')
const os = require('os')

const binFolder = child_process
  .execSync('yarn bin')
  .toString()
  .replace(/(\s+$)/g, '')
const microbundle = binFolder + '/microbundle'

const projects = fs.readdirSync('pkgs/')
const templatePackageJsonSource = fs.readFileSync('scripts/package-template.json', 'utf8')

const buildCommand =
  microbundle +
  ' --compress ' + 
  // ' --no-compress ' +
  ' --source-map --entry $pkg.ts --name rval_$pkg --strict --format es,cjs,umd --globals ' +
  projects.map(pkg => '@r-val/' + pkg + '=rval_' + pkg).join(',') + 
  ' --external ' + projects.map(pkg => '@r-val/' + pkg).join(',') + 
  ' && mv dist/$pkg/*.d.ts dist/ ' +
  ' && rimraf dist/$pkg .rts2* mangle.json'

const corePkgJson = JSON.parse(fs.readFileSync(__dirname + '/../pkgs/core/package.json', 'utf8'))

projects.forEach(pkg => {
  const pkgJson = JSON.parse(fs.readFileSync(__dirname + '/../pkgs/' + pkg + '/package.json', 'utf8'))
  const templateJson = JSON.parse(templatePackageJsonSource.replace(/\$pkg/g, pkg))

  // If reserved is set, mangle all the property names!
  // property names as defined in core shouldn't be mangled either
  if (Array.isArray(pkgJson.reserved)) {
    pkgJson.mangle = {
      reserved: Array.from(new Set([...corePkgJson.reserved, ...pkgJson.reserved])),
    }
  }

  for (const key in templateJson) if (!(key in pkgJson))
    pkgJson[key] = templateJson[key]

  fs.writeFileSync(__dirname + '/../pkgs/' + pkg + '/package.json', JSON.stringify(pkgJson, null, '  '), 'utf8')
  const command = buildCommand.replace(/\$pkg/g, pkg)
  console.log('Running ' + command)
  child_process.execSync(command, {
    cwd: __dirname + '/../pkgs/' + pkg,
    stdio: [0, 1, 2],
  })
})
