const fs = require("fs")
const path = require("path")
const child_process = require("child_process")

// exit upon first error
shell.set("-e")

const projects = ["core", "react", "immer", "models"]
const externals = ["immer", "react"]

const packageJson = fs.readFileSync("pkgs/package-template.json", "utf8")
// TODO: fix for linux
const buildCommand = "..\\..\\node_modules\\.bin\\microbundle.cmd --entry $pkg.ts --name rval$pkg --strict --format es,cjs,umd --globals "
   + [].concat(projects.map(pkg => "@rval/" + pkg + "=rval" + pkg), externals.map(pkg => pkg + "=" + pkg)).join(",") + ",immer=immer,react=react --external "
   + externals.concat(projects.map(pkg => "@rval/" + pkg)).join(",")
   + " && mv dist/$pkg/*.d.ts dist/ && rimraf dist/$pkg"

projects.forEach(pkg => {
    fs.writeFileSync("pkgs/" + pkg + "/package.json", packageJson.replace(/\$pkg/g, pkg), "utf8")
    const command = buildCommand.replace(/\$pkg/g, pkg)
    console.log("Running " + command)
    child_process.execSync(command, {
        cwd: "pkgs/" + pkg,
        stdio: [0,1,2]
    })
})

// "build": "../../node_modules/.bin/microbundle --entry core.ts --name rval --strict && cp dist/core/*.d.ts dist/ rimraf dist/core"