import {minify} from "uglify-es"
import filesize from "rollup-plugin-filesize"
import uglify from "rollup-plugin-uglify"
import typescript from 'rollup-plugin-typescript';

function getConfig(dest, format, ugly) {
    const conf = {
        input: "index.ts",
        output: {
            exports: "named",
            file: dest,
            format,
            name: "rval",
            sourcemap: true
        },
        plugins: [
            typescript({
            }),
            ugly &&
                uglify(
                    {
                        warnings: true,
                        toplevel: true,
                        sourceMap: true,
                        mangle: {
                            properties:  {
                                    reserved: [
                                        "val",
                                        "drv",
                                        "sub",
                                        "batch",
                                        "batched"
                                    ]
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

const config = [
    getConfig("dist/rval.js", "cjs", true),
    getConfig("dist/rval.umd.js", "umd", true),
    getConfig("dist/rval.module.js", "es", true)
]

export default config
