const fs = require("fs")
const child_process = require("child_process")
const os = require("os")

const microbundle = os.platform() === "win32" ? "..\\..\\node_modules\\.bin\\microbundle.cmd" : "../../node_modules/./bin/microbundle"

const projects = ["core", "react", "immer", "models"]
const externals = ["immer", "react"]
const packageJson = fs.readFileSync("pkgs/package-template.json", "utf8")

const buildCommand = microbundle + " --entry $pkg.ts --name rval$pkg --strict --format es,cjs,umd --globals "
   + [].concat(projects.map(pkg => "@rval/" + pkg + "=rval" + pkg), externals.map(pkg => pkg + "=" + pkg)).join(",") + ",immer=immer,react=react --external "
   + externals.concat(projects.map(pkg => "@rval/" + pkg)).join(",")
   + " && mv dist/$pkg/*.d.ts dist/ && rimraf dist/$pkg .rts2*"

projects.forEach(pkg => {
    // at some point we might want to disable this for some projects, (and put peer deps in @rval/immer, @rval/react etc)
    // but for now it's neat enough to allow quick iterations
    fs.writeFileSync("pkgs/" + pkg + "/package.json", packageJson.replace(/\$pkg/g, pkg), "utf8")
    const command = buildCommand.replace(/\$pkg/g, pkg)
    console.log("Running " + command)
    child_process.execSync(command, {
        cwd: "pkgs/" + pkg,
        stdio: [0,1,2]
    })
})
