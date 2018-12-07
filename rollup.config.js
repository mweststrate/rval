import filesize from "rollup-plugin-filesize"
import { terser } from "rollup-plugin-terser"
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
                terser(
                    {
                        warnings: true,
                        compress: true,
                        mangle: {
                            properties: {
                                keep_quoted: true,
                                reserved
                            },
                            reserved
                        },
                        module: true,
                        toplevel: true,
                        sourcemap: true,
                    }
                ),
            filesize()
        ].filter(Boolean)
    }

    return conf
}

function generateConfigs(mod, reserved, umdName) {
    return [
        getConfig(mod, mod + "/index.js", "cjs", true, reserved),
        umdName && getConfig(mod, mod + "/index.umd.js", "umd", true, reserved, umdName),
        getConfig(mod, mod + "/index.module.js", "es", true, reserved)
    ]
}

const rvalApi = [
    "rval",
    "val",
    "drv",
    "sub",
    "batch",
    "batched",
    "deepfreeze",
    "isVal",
    "isDrv"
]

const config = [
    ...generateConfigs("core", rvalApi, "rval"),
    ...generateConfigs("immer", [...rvalApi, "updater"]),
    ...generateConfigs("models", [...rvalApi, "model", "invariant", "mapOf", "arrayOf"]),
    ...generateConfigs("react", [...rvalApi])
].filter(Boolean)

export default config
