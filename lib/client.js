window.__ModuleLoader__.load({
	id: "dsh-agent-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from2, except, desc) => {
  if (from2 && typeof from2 === "object" || typeof from2 === "function") {
    for (let key of __getOwnPropNames(from2))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// node_modules/@deepseek-ai/cosmokit/lib/index.js
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
  return result;
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
(function(Binary2) {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    else return source;
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  if (a === b) return true;
  if (!strict && isNullable(a) && isNullable(b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!a || !b) return false;
  function check(test, then) {
    return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
  }
  return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
    if (a2.byteLength !== b2.byteLength) return false;
    const viewA = new Uint8Array(a2);
    const viewB = new Uint8Array(b2);
    for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
    return true;
  }) ?? Object.keys({
    ...a,
    ...b
  }).every((key) => deepEqual(a[key], b[key], strict));
}
var Time;
(function(Time2) {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) date2 = Date.now() + parsed;
    else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
    else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
    else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
    else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// node_modules/@deepseek-ai/schemastery/lib/index.mjs
var kSchema = /* @__PURE__ */ Symbol.for("schemastery");
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
globalThis.__schemastery_index__ ?? (globalThis.__schemastery_index__ = 0);
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    __publicField(this, "options");
    __publicField(this, "name", "ValidationError");
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError];
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta || (schema.meta = {});
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
  var _a, _b;
  if (globalThis.__schemastery_refs__) {
    (_a = globalThis.__schemastery_refs__)[_b = this.uid] ?? (_a[_b] = JSON.parse(JSON.stringify({ ...this })));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
    return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
  });
  if (schema.list) schema.list = schema.list.map((inner, index) => {
    return inner.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
};
for (const key of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  var _a;
  const schema = Schema(this);
  (_a = schema.meta).badges || (_a.badges = []);
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  var _a;
  const schema = Schema(this);
  (_a = schema.meta).badges || (_a.badges = []);
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
var resolvers = {};
Schema.extend = function extend(type, resolve2) {
  resolvers[type] = resolve2;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta2, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta2;
  if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta: meta2 }, options) => {
  if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
  if (meta2.pattern) {
    const regexp = new RegExp(meta2.pattern.source, meta2.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta2, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta: meta2 }, options) => {
  if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
  checkWithinRange(data, meta2, "number", options);
  const { step } = meta2;
  if (step && !isMultipleOf(data, meta2.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta: meta2 }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) if (data & bits[key]) keys.push(key);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else throw new ValidationError(`expected number or array but got ${data}`, options);
  if (value === meta2.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta: meta2 }, options) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta2, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) result[key] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) try {
    return Schema.resolve(data, inner, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ?? (result = {}), value);
    else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name2, keys, format) {
  formatters[name2] = format;
  Object.assign(Schema, { [name2](...args) {
    const schema = new Schema({ type: name2 });
    keys.forEach((key, index) => {
      switch (key) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key2 in args[index]) {
            if (typeof args[index][key2] !== "number") continue;
            schema.bits[key2] = args[index][key2];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] || (callback["toJSON"] = () => callback.toString());
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] || (constructor["toJSON"] = () => constructor["name"]);
          break;
        }
        default:
          schema[key] = args[index];
      }
    });
    if (name2 === "object" || name2 === "dict") schema.meta.default = {};
    else if (name2 === "array" || name2 === "tuple") schema.meta.default = [];
    else if (name2 === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner }, isInner) => inner.toString(isInner));

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "memory-ui";
var inject = ["slots"];
var Config = Schema.object({});
var READ = "/dsh-memory-read";
var WRITE = "/dsh-memory-write";
var KIND_LABEL = {
  fact: "\u4E8B\u5B9E",
  preference: "\u504F\u597D",
  decision: "\u51B3\u7B56",
  lesson: "\u6559\u8BAD",
  todo: "\u5F85\u529E",
  note: "\u7B14\u8BB0"
};
var card = {
  border: "1px solid var(--dsw-alias-border-normal, #555)",
  borderRadius: 8,
  padding: "12px 16px",
  marginBottom: 8,
  background: "var(--dsw-alias-bg-layer-1, #1f1f1f)"
};
var meta = { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 };
var badge = {
  fontSize: 11,
  padding: "1px 7px",
  borderRadius: 10,
  border: "1px solid var(--dsw-alias-border-normal, #666)",
  color: "var(--dsw-alias-text-secondary, #aaa)"
};
var contentStyle = { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "inherit", fontSize: 13, lineHeight: 1.55 };
var row = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
var inputStyle = {
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 13,
  color: "inherit",
  border: "1px solid var(--dsw-alias-border-normal, #666)",
  background: "var(--dsw-alias-bg-layer-1, #2a2a2a)"
};
var btn = {
  padding: "3px 10px",
  borderRadius: 6,
  fontSize: 12,
  color: "inherit",
  cursor: "pointer",
  border: "1px solid var(--dsw-alias-border-normal, #666)",
  background: "var(--dsw-alias-bg-layer-1, #2a2a2a)"
};
var delBtn = { ...btn, color: "#e5484d", borderColor: "#e5484d80" };
var danger = { color: "#e5484d" };
var muted = { color: "var(--dsw-alias-text-secondary, #999)" };
function apply(ctx, _config) {
  const connection = ctx.get("connection");
  if (!connection) return;
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "memory",
    order: 25,
    label: () => "\u8BB0\u5FC6",
    inject: () => ({ connection })
  }, MemoryPanel));
}
function MemoryPanel({ connection }) {
  const [stats, setStats] = (0, import_react.useState)(null);
  const [entries, setEntries] = (0, import_react.useState)([]);
  const [query, setQuery] = (0, import_react.useState)("");
  const [kind, setKind] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const [editing, setEditing] = (0, import_react.useState)(null);
  const [confirmId, setConfirmId] = (0, import_react.useState)(null);
  const [creating, setCreating] = (0, import_react.useState)(null);
  const load = (0, import_react.useCallback)(async (q, k) => {
    setBusy(true);
    setError("");
    try {
      const s = await connection.rpc.call(READ, "stats");
      if (s.ok) setStats(s.value);
      let l;
      if (q.trim() !== "") {
        l = await connection.rpc.call(READ, "search", { query: q, limit: 20, content_max: 300 });
        if (l.ok) {
          const v = l.value;
          setEntries(v.results.map((r) => ({ ...r, tags: r.tags ?? [], scope: r.scope ?? "project", updatedAt: r.updatedAt ?? "", expiresAt: null })));
        }
      } else {
        l = await connection.rpc.call(READ, "list", k ? { kinds: [k], limit: 100 } : { limit: 100 });
        if (l.ok) setEntries(l.value.entries ?? []);
      }
      if (!l.ok) setError(l.error?.message ?? "\u52A0\u8F7D\u5931\u8D25");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [connection]);
  (0, import_react.useEffect)(() => {
    void load("", "");
  }, [load]);
  const remove = async (id) => {
    const r = await connection.rpc.call(WRITE, "forget", { id, confirm: true });
    if (!r.ok) {
      setError(r.error?.message ?? "\u5220\u9664\u5931\u8D25");
      setConfirmId(null);
      return;
    }
    setConfirmId(null);
    void load(query, kind);
  };
  const saveEdit = async () => {
    if (!editing) return;
    const tags = editing.tags.split(/[,，\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const r = await connection.rpc.call(WRITE, "update", { id: editing.id, content: editing.content, tags, importance: editing.importance });
    if (!r.ok) {
      setError(r.error?.message ?? "\u4FDD\u5B58\u5931\u8D25");
      return;
    }
    setEditing(null);
    void load(query, kind);
  };
  const saveCreate = async () => {
    if (!creating) return;
    const tags = creating.tags.split(/[,，\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const r = await connection.rpc.call(WRITE, "remember", {
      content: creating.content,
      kind: creating.kind,
      tags,
      scope: creating.scope,
      importance: creating.importance
    });
    if (!r.ok) {
      setError(r.error?.message ?? "\u4FDD\u5B58\u5931\u8D25");
      return;
    }
    setCreating(null);
    void load(query, kind);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "inherit" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 8 }, children: "\u8BB0\u5FC6(dsh-agent-memory)" }),
    stats && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, ...muted, marginBottom: 10, fontSize: 12, gap: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u5171 ",
        stats.total,
        " \u6761"
      ] }),
      stats.expired > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: danger, children: [
        "\u5DF2\u8FC7\u671F ",
        stats.expired
      ] }),
      Object.entries(stats.byKind).map(([k, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        KIND_LABEL[k] ?? k,
        " ",
        n
      ] }, k))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, marginBottom: 10 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          style: { ...inputStyle, width: 180 },
          placeholder: "\u641C\u7D22\u8BB0\u5FC6\u2026",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") void load(query, kind);
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { style: inputStyle, value: kind, onChange: (e) => {
        setKind(e.target.value);
        void load(query, e.target.value);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u7C7B\u578B" }),
        Object.entries(KIND_LABEL).map(([k, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: k, children: label }, k))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => void load(query, kind), disabled: busy, children: busy ? "\u52A0\u8F7D\u4E2D\u2026" : "\u67E5\u8BE2" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: { ...btn, marginLeft: "auto", fontWeight: 600 }, onClick: () => setCreating({ content: "", kind: "fact", tags: "", scope: "user", importance: 2 }), children: "\uFF0B \u65B0\u5EFA" })
    ] }),
    error !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...danger, fontSize: 12, marginBottom: 8 }, children: error }),
    creating && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          style: { ...inputStyle, width: "100%", minHeight: 80, resize: "vertical", fontFamily: "inherit" },
          placeholder: "\u8981\u8BB0\u4F4F\u7684\u5185\u5BB9\u2026",
          value: creating.content,
          onChange: (ev) => setCreating({ ...creating, content: ev.target.value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, marginTop: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { style: inputStyle, value: creating.kind, onChange: (ev) => setCreating({ ...creating, kind: ev.target.value }), children: Object.entries(KIND_LABEL).map(([k, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: k, children: label }, k)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { style: inputStyle, value: creating.scope, onChange: (ev) => setCreating({ ...creating, scope: ev.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "user", children: "\u5168\u5C40" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "project", children: "\u9879\u76EE" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { style: inputStyle, value: creating.importance, onChange: (ev) => setCreating({ ...creating, importance: Number(ev.target.value) }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 1, children: "\u91CD\u8981\u5EA6 1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 2, children: "\u91CD\u8981\u5EA6 2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 3, children: "\u91CD\u8981\u5EA6 3" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: { ...inputStyle, flex: 1, minWidth: 120 },
            placeholder: "\u6807\u7B7E,\u9017\u53F7\u5206\u9694",
            value: creating.tags,
            onChange: (ev) => setCreating({ ...creating, tags: ev.target.value })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => void saveCreate(), disabled: creating.content.trim() === "", children: "\u4FDD\u5B58" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => setCreating(null), children: "\u53D6\u6D88" })
      ] })
    ] }),
    entries.length === 0 && !busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...muted, fontSize: 13 }, children: "\u6682\u65E0\u8BB0\u5FC6" }),
    entries.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: card, children: editing?.id === e.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          style: { ...inputStyle, width: "100%", minHeight: 80, resize: "vertical", fontFamily: "inherit" },
          value: editing.content,
          onChange: (ev) => setEditing({ ...editing, content: ev.target.value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, marginTop: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: { ...inputStyle, flex: 1, minWidth: 120 },
            placeholder: "\u6807\u7B7E,\u9017\u53F7\u5206\u9694",
            value: editing.tags,
            onChange: (ev) => setEditing({ ...editing, tags: ev.target.value })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { style: inputStyle, value: editing.importance, onChange: (ev) => setEditing({ ...editing, importance: Number(ev.target.value) }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 1, children: "\u91CD\u8981\u5EA6 1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 2, children: "\u91CD\u8981\u5EA6 2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 3, children: "\u91CD\u8981\u5EA6 3" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => void saveEdit(), children: "\u4FDD\u5B58" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => setEditing(null), children: "\u53D6\u6D88" })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: meta, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: badge, children: KIND_LABEL[e.kind] ?? e.kind }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: badge, children: [
          "\u91CD\u8981\u5EA6 ",
          e.importance
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: badge, children: e.scope === "user" ? "\u5168\u5C40" : "\u9879\u76EE" }),
        e.tags.slice(0, 4).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: badge, children: [
          "#",
          t
        ] }, t)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...muted, marginLeft: "auto", fontSize: 11 }, children: e.updatedAt?.slice(0, 10) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: contentStyle, children: e.content }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }, children: confirmId === e.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...muted, fontSize: 12 }, children: "\u786E\u8BA4\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6?" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: delBtn, onClick: () => void remove(e.id), children: "\u5220\u9664" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => setConfirmId(null), children: "\u53D6\u6D88" })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: btn, onClick: () => setEditing({ id: e.id, content: e.content, tags: e.tags.join(", "), importance: e.importance }), children: "\u7F16\u8F91" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: delBtn, onClick: () => setConfirmId(e.id), children: "\u5220\u9664" })
      ] }) })
    ] }) }, e.id))
  ] });
}

		return module.exports;
	}
});

