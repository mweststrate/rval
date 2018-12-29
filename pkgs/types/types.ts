import { _isPlainObject } from "@r-val/core";

export type TypeChecker<T> = (value: any) => T

function createTypeChecker<T>(predicate: (v: any) => boolean, typeName: string): TypeChecker<T> {
  return Object.assign(
    function(v) {
      if (!predicate(v)) {
        const vAsStr = _isPlainObject(v) || Array.isArray(v) ? JSON.stringify(v) : v
        throw new Error(`Typecheck failed, expected '${typeName}', got: (${typeof v}) '${vAsStr}'`)
      }
      return v
    },
    {
      typeName: typeName,
    }
  )
}

function getTypeName(fn) {
  if (fn.typeName) return fn.typeName
  throw new Error('Not a type-checker function:' + fn)
}

function isA(typeChecker, value) {
  try {
    typeChecker(value)
    return true
  } catch (e) {
    return false
  }
}

export const isLiteral = <T>(value: T) => createTypeChecker<T>(v => v === value, "" + value)
export const isNull = isLiteral(null)
export const isUndefined = isLiteral(undefined)
export const isNumber = createTypeChecker<number>(v => typeof v === 'number', 'number')
export const isString = createTypeChecker<number>(v => typeof v === 'string', 'string')
export const isBoolean = createTypeChecker<number>(v => typeof v === 'boolean', 'boolean')
export const isFunction = createTypeChecker<Function>(v => typeof v === 'function', 'function')
export const isDate = isInstanceOf(Date)

export function isInstanceOf<T>(type: new (...args: any[]) => T): TypeChecker<T> {
  return createTypeChecker<T>(v => v instanceof type, type.name)
}

// Could use typings, but requires a lot of overloads
export function isUnion<T>(...types: TypeChecker<any>[]): TypeChecker<T> {
  return createTypeChecker(
    v => types.some(t => isA(t, v)),
    types.map(getTypeName).join(" | ")
  )
}

export function isMaybe<T>(subTypeChecker: TypeChecker<T>): TypeChecker<T|null|undefined> {
  return isUnion(subTypeChecker, isUndefined, isNull)
}

// Could use typings, but requires a lot of overloads
export function isEnum<T>(values: T[]): TypeChecker<T> {
  return isUnion(...values.map(isLiteral))
}

export function isArray<T>(subTypeChecker: TypeChecker<T>): TypeChecker<T[]> {
  return createTypeChecker(
    v => Array.isArray(v) && v.every(i => isA(subTypeChecker, i)),
    `Array<${getTypeName(subTypeChecker)}>`
  )
}

export function isMap<T>(subTypeChecker: TypeChecker<T>): TypeChecker<{[key: string]: T}> {
  return createTypeChecker(
    v => _isPlainObject(v) && Object.keys(v).every(key => isA(subTypeChecker, v[key])),
    `Map<${getTypeName(subTypeChecker)}>`
  )
}

export function isShape<T extends {[key: string]: TypeChecker<any> }>(shape: T): TypeChecker<T> {
  const typeString = "Object<{\n\t"
    + Object.keys(shape).map(key => `${key}: ${getTypeName(shape[key])}`).join(",\n\t")
    + "\n}>";
  return createTypeChecker(
    v => Object.keys(shape).every(key => isA(shape[key], v[key])),
    typeString
  )
}

export function invariant<T>(predicate: (v: T) => boolean): TypeChecker<T> {
  return createTypeChecker(predicate, `invariant '${predicate.toString()}'`)
}
