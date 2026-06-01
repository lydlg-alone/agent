function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function requireObject(value, fieldName = "请求体") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createValidationError(`${fieldName}必须是对象。`);
  }

  return value;
}

export function requireString(value, fieldName, options = {}) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw createValidationError(`${fieldName}不能为空。`);
  }

  if (options.maxLength && normalized.length > options.maxLength) {
    throw createValidationError(`${fieldName}长度不能超过 ${options.maxLength} 个字符。`);
  }

  return normalized;
}

export function optionalString(value, fieldName, options = {}) {
  if (value == null) {
    return options.defaultValue ?? "";
  }

  if (typeof value !== "string") {
    throw createValidationError(`${fieldName}必须是字符串。`);
  }

  const normalized = value.trim();
  if (options.maxLength && normalized.length > options.maxLength) {
    throw createValidationError(`${fieldName}长度不能超过 ${options.maxLength} 个字符。`);
  }

  return normalized;
}

export function optionalNumber(value, fieldName, options = {}) {
  if (value == null || value === "") {
    return options.defaultValue ?? 0;
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw createValidationError(`${fieldName}必须是有效数字。`);
  }

  if (options.integer && !Number.isInteger(normalized)) {
    throw createValidationError(`${fieldName}必须是整数。`);
  }
  if (options.min != null && normalized < options.min) {
    throw createValidationError(`${fieldName}不能小于 ${options.min}。`);
  }
  if (options.max != null && normalized > options.max) {
    throw createValidationError(`${fieldName}不能大于 ${options.max}。`);
  }

  return normalized;
}

export function optionalBoolean(value, fieldName, options = {}) {
  if (value == null || value === "") {
    return options.defaultValue ?? false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  throw createValidationError(`${fieldName}必须是布尔值。`);
}

export function optionalObject(value, fieldName, options = {}) {
  if (value == null) {
    return options.defaultValue ?? {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw createValidationError(`${fieldName}必须是对象。`);
  }

  return value;
}

export function requireArray(value, fieldName, options = {}) {
  if (!Array.isArray(value)) {
    throw createValidationError(`${fieldName}必须是数组。`);
  }

  if (options.maxLength != null && value.length > options.maxLength) {
    throw createValidationError(`${fieldName}数量不能超过 ${options.maxLength}。`);
  }

  return value;
}

export function optionalStringArray(value, fieldName, options = {}) {
  if (value == null) {
    return [];
  }

  const array = requireArray(value, fieldName, options);
  return array.map((item, index) =>
    requireString(item, `${fieldName}[${index}]`, {
      maxLength: options.itemMaxLength
    })
  );
}
