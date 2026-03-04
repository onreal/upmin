export const getAgentField = (data: Record<string, unknown>, key: string) =>
  typeof data[key] === "string" ? (data[key] as string) : "";
