import { isRecord } from "../../utils";

type JsonPath = string[];

type MergePlan = {
  path: JsonPath;
  value: unknown;
};

type MergeSuccess = {
  ok: true;
  data: Record<string, unknown>;
  path: JsonPath;
};

export type MergeFailureCode = "invalid_json" | "no_target" | "schema_mismatch";

type MergeFailure = {
  ok: false;
  code: MergeFailureCode;
};

export type AssistantMergeResult = MergeSuccess | MergeFailure;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const primitiveKind = (value: unknown) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
};

const parseJsonCandidate = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonCandidates = (content: string) => {
  const trimmed = content.trim();
  const candidates = new Set<string>();
  if (trimmed !== "") {
    candidates.add(trimmed);
  }

  const blockPattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of trimmed.matchAll(blockPattern)) {
    const inner = match[1]?.trim();
    if (inner) {
      candidates.add(inner);
    }
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.add(trimmed.slice(firstObject, lastObject + 1).trim());
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    candidates.add(trimmed.slice(firstArray, lastArray + 1).trim());
  }

  return [...candidates];
};

const parseAssistantJson = (content: string) => {
  for (const candidate of extractJsonCandidates(content)) {
    const parsed = parseJsonCandidate(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const arraysCompatible = (target: unknown[], incoming: unknown[]) => {
  if (!incoming.length || !target.length) {
    return true;
  }
  return incoming.every((item) => valuesCompatible(target[0], item));
};

const objectCompatible = (target: Record<string, unknown>, incoming: Record<string, unknown>): boolean =>
  Object.entries(incoming).every(([key, value]) => {
    if (!hasOwn(target, key)) {
      return false;
    }
    return valuesCompatible(target[key], value);
  });

const valuesCompatible = (target: unknown, incoming: unknown): boolean => {
  if (Array.isArray(target)) {
    return Array.isArray(incoming) && arraysCompatible(target, incoming);
  }
  if (isRecord(target)) {
    return isRecord(incoming) && objectCompatible(target, incoming);
  }
  return !Array.isArray(incoming) && !isRecord(incoming) && primitiveKind(target) === primitiveKind(incoming);
};

const collectCandidateObjects = (value: unknown, nodes: Array<Record<string, unknown>> = []) => {
  if (isRecord(value)) {
    nodes.push(value);
    Object.values(value).forEach((child) => collectCandidateObjects(child, nodes));
    return nodes;
  }
  if (Array.isArray(value)) {
    value.forEach((child) => collectCandidateObjects(child, nodes));
  }
  return nodes;
};

const collectTargetObjects = (
  value: unknown,
  path: JsonPath = [],
  nodes: Array<{ path: JsonPath; value: Record<string, unknown> }> = []
) => {
  if (!isRecord(value)) {
    return nodes;
  }
  nodes.push({ path, value });
  Object.entries(value).forEach(([key, child]) => {
    if (isRecord(child)) {
      collectTargetObjects(child, [...path, key], nodes);
    }
  });
  return nodes;
};

const preferredPlan = (data: Record<string, unknown>, incoming: unknown, targetKey: string) => {
  if (!hasOwn(data, targetKey)) {
    return null;
  }
  const target = data[targetKey];
  if (valuesCompatible(target, incoming)) {
    return { path: [targetKey], value: incoming } satisfies MergePlan;
  }
  if (isRecord(incoming) && hasOwn(incoming, targetKey) && valuesCompatible(target, incoming[targetKey])) {
    return { path: [targetKey], value: incoming[targetKey] } satisfies MergePlan;
  }
  return null;
};

const resolveMergePlan = (data: Record<string, unknown>, incoming: unknown, targetKey: string) => {
  const preferred = preferredPlan(data, incoming, targetKey);
  if (preferred) {
    return preferred;
  }

  if (!isRecord(incoming)) {
    return null;
  }

  const targetNodes = collectTargetObjects(data);
  for (const candidate of collectCandidateObjects(incoming)) {
    const match = targetNodes.find((target) => objectCompatible(target.value, candidate));
    if (match) {
      return { path: match.path, value: candidate } satisfies MergePlan;
    }
  }
  return null;
};

const mergeValues = (target: unknown, incoming: unknown): unknown => {
  if (Array.isArray(target) && Array.isArray(incoming)) {
    return [...target, ...clone(incoming)];
  }
  if (isRecord(target) && isRecord(incoming)) {
    const next = clone(target);
    Object.entries(incoming).forEach(([key, value]) => {
      if (!hasOwn(next, key)) {
        return;
      }
      next[key] = mergeValues(next[key], value);
    });
    return next;
  }
  return clone(incoming);
};

const getValueAtPath = (data: Record<string, unknown>, path: JsonPath) => {
  let current: unknown = data;
  for (const key of path) {
    if (!isRecord(current) || !hasOwn(current, key)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

const setValueAtPath = (data: Record<string, unknown>, path: JsonPath, value: unknown) => {
  if (!path.length) {
    return isRecord(value) ? value : data;
  }

  let current: Record<string, unknown> = data;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const next = current[key];
    if (!isRecord(next)) {
      return data;
    }
    current = next;
  }

  current[path[path.length - 1] as string] = value;
  return data;
};

export const describeMergePath = (path: JsonPath) => (path.length ? path.join(".") : "data");

export const mergeAssistantJson = (
  data: Record<string, unknown>,
  content: string,
  targetKey: string
): AssistantMergeResult => {
  const incoming = parseAssistantJson(content);
  if (incoming === null) {
    return {
      ok: false,
      code: "invalid_json",
    };
  }

  const plan = resolveMergePlan(data, incoming, targetKey);
  if (!plan) {
    return {
      ok: false,
      code: "no_target",
    };
  }

  const nextData = clone(data);
  const currentValue = getValueAtPath(nextData, plan.path);
  if (typeof currentValue === "undefined" || !valuesCompatible(currentValue, plan.value)) {
    return {
      ok: false,
      code: "schema_mismatch",
    };
  }

  const mergedData = setValueAtPath(nextData, plan.path, mergeValues(currentValue, plan.value));
  return {
    ok: true,
    data: mergedData,
    path: plan.path,
  };
};
