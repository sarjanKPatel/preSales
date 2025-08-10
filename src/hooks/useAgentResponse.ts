// TODO: Replace with new database integration
export function useAgentResponse() {
  return {
    loading: false,
    error: null,
    sendMessage: async (message: string) => {
      return {
        id: Date.now().toString(),
        content: "This is a placeholder response. Database integration needs to be implemented.",
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
      };
    },
  };
}