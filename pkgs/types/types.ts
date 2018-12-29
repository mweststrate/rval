export const isNumber = createTypeCheck<number>(v => typeof v === "number", "number")
export const isString = createTypeCheck<number>(v => typeof v === "string", "string")
export const isBoolean = createTypeCheck<number>(v => typeof v === "boolean", "boolean")

function createTypeCheck<T>(predicate: (v: any) => boolean, message: string): (v: any) => T {
  return function(v) {
    if (!predicate(v)) throw new Error(`Typecheck failed, expected '${message}', got: (${typeof v}) '${v}'`);
    return v
  }
}

// date

// fn

// instanceof

// shape

// array

// maybe

// union

// enum

// invariant