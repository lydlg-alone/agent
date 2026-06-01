import {
  optionalBoolean,
  optionalNumber,
  optionalObject,
  optionalString,
  optionalStringArray,
  requireArray,
  requireObject,
  requireString
} from "./requestValidation.js";

export function defineObjectSchema(shape, fieldName = "请求数据") {
  return (value) => {
    const payload = requireObject(value, fieldName);
    const result = {};

    for (const [key, parser] of Object.entries(shape)) {
      result[key] = parser(payload[key], key, payload);
    }

    return result;
  };
}

export function stringField(label, options = {}) {
  return (value) => requireString(value, label, options);
}

export function optionalStringField(label, options = {}) {
  return (value) => optionalString(value, label, options);
}

export function optionalNumberField(label, options = {}) {
  return (value) => optionalNumber(value, label, options);
}

export function optionalBooleanField(label, options = {}) {
  return (value) => optionalBoolean(value, label, options);
}

export function optionalObjectField(label, options = {}) {
  return (value) => optionalObject(value, label, options);
}

export function stringArrayField(label, options = {}) {
  return (value) => optionalStringArray(value, label, options);
}

export function arrayField(label, itemParser, options = {}) {
  return (value) =>
    requireArray(value, label, options).map((item, index) => itemParser(item, index));
}

function createValidator(source, schema) {
  return (req, _res, next) => {
    try {
      req.validated = req.validated || {};
      req.validated[source] = schema(req[source]);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateBody(schema) {
  return createValidator("body", schema);
}

export function validateQuery(schema) {
  return createValidator("query", schema);
}

export function validateParams(schema) {
  return createValidator("params", schema);
}
