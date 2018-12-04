import {minify} from "uglify-es"
import filesize from "rollup-plugin-filesize"
import uglify from "rollup-plugin-uglify"
import typescript from 'rollup-plugin-typescript2';

function getConfig(mod, dest, format, ugly, reserved = [], umdName) {
    const conf = {
        input: "src/rval-" + mod + ".ts",
        output: {
            exports: "named",
            file: dest,
            format,
            name: umdName,
            sourcemap: true
        },
        external: ["rval", "immer"],
        plugins: [
            typescript({
                exclude: ["tests/**/*"]
            }),
            ugly &&
                uglify(
                    {
                        warnings: true,
                        toplevel: true,
                        sourceMap: true,
                        mangle: {
                            properties:  {
                                    reserved: reserved
                                }
                        }
                    },
                    minify
                ),
            filesize()
        ].filter(Boolean)
    }

    return conf
}

function generateConfigs(mod, reserved, umdName) {
    return [
        // TODO: re-enable minify
        getConfig(mod, mod + "/index.js", "cjs", false, reserved),
        umdName && getConfig(mod, mod + "/index.umd.js", "umd", false, reserved, umdName),
        getConfig(mod, mod + "/index.module.js", "es", false, reserved)
    ]
}

const config = [
    ...generateConfigs("core", [
        "val",
        "drv",
        "sub",
        "batch",
        "batched"
    ], "rval"),
    ...generateConfigs("immer"),
    ...generateConfigs("models"),
    ...generateConfigs("react")
].filter(Boolean)

export default config
