// Currently no templates are being used in the agent implementation
// Tools like InformationExtractor and GapDetector build their prompts inline
// This file is kept for potential future use but all unused templates have been removed

export class PromptTemplate {
  constructor(
    public name: string,
    public template: string,
    public requiredVars: string[],
    public description?: string
  ) {}

  render(vars: Record<string, any>): string {
    let result = this.template;
    
    // Validate required vars
    for (const varName of this.requiredVars) {
      if (!(varName in vars)) {
        throw new Error(`Missing required variable: ${varName}`);
      }
    }
    
    // Replace variables
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }
}