export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function toMcpError(error: unknown): { isError: true; content: [{ type: "text"; text: string }] } {
  return {
    isError: true,
    content: [{ type: "text", text: formatError(error) }],
  };
}
