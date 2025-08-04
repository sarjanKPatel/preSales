import { useState, useCallback } from 'react';
import { DraftVision } from '@/components/chat';
import { MessageProps } from '@/components/chat';

const visionResponses = [
  {
    trigger: /mission|purpose|why/i,
    responses: [
      "Based on your input, I can help craft a compelling mission statement. What specific impact do you want your company to have on your customers or the world?",
      "A strong mission statement should be concise and inspiring. Let me help you articulate your company's core purpose. What problem are you solving?",
    ],
    updateVision: (content: string) => ({
      mission: "To revolutionize the way businesses operate through innovative technology solutions that drive efficiency and growth."
    })
  },
  {
    trigger: /values|principles|culture/i,
    responses: [
      "Core values are the foundation of your company culture. What principles guide your decision-making? Consider values like innovation, integrity, customer-first, etc.",
      "Let's define the values that will shape your company's identity. What behaviors and principles do you want to encourage in your team?",
    ],
    updateVision: (content: string) => ({
      values: "Innovation, Integrity, Customer Excellence, Collaboration, Continuous Learning"
    })
  },
  {
    trigger: /goals|objectives|targets/i,
    responses: [
      "Strategic goals should be specific and measurable. What milestones do you want to achieve in the next 1-3 years? Think about revenue, market expansion, product launches, etc.",
      "Let's set some ambitious yet achievable goals. Consider both financial targets and strategic milestones. What does success look like for your company?",
    ],
    updateVision: (content: string) => ({
      goals: "1. Achieve $50M ARR within 2 years\n2. Expand to 10 new markets\n3. Launch 3 innovative products\n4. Build a team of 200+ talented professionals"
    })
  },
  {
    trigger: /unique|differentiate|competitive|advantage/i,
    responses: [
      "Your unique value proposition sets you apart from competitors. What makes your solution different? How do you deliver value that others can't?",
      "Let's identify what makes your company special. Think about your unique approach, technology, expertise, or customer experience. What's your secret sauce?",
    ],
    updateVision: (content: string) => ({
      uniqueValue: "We combine cutting-edge AI technology with deep industry expertise to deliver solutions that are 10x more efficient than traditional alternatives."
    })
  }
];

const leadResponses = [
  {
    trigger: /qualify|criteria|ideal/i,
    response: "To qualify leads effectively, consider factors like budget, authority, need, and timeline (BANT). What criteria are most important for your ideal customer?"
  },
  {
    trigger: /follow up|contact|reach out/i,
    response: "Consistent follow-up is key. I recommend a cadence of: Day 1 - Initial contact, Day 3 - Follow-up email, Day 7 - Phone call, Day 14 - Value-add content. Would you like me to help create templates?"
  },
  {
    trigger: /convert|close|win/i,
    response: "To improve conversion rates, focus on understanding the prospect's pain points and clearly articulating your value proposition. What's your current conversion rate, and what challenges are you facing?"
  }
];

const proposalResponses = [
  {
    trigger: /structure|outline|sections/i,
    response: "A winning proposal typically includes: Executive Summary, Problem Statement, Proposed Solution, Implementation Timeline, Pricing, ROI Analysis, and Next Steps. Which sections would you like to focus on?"
  },
  {
    trigger: /pricing|cost|budget/i,
    response: "Pricing should reflect your value proposition. Consider offering multiple tiers or options. Include a clear ROI calculation to justify the investment. What's your typical deal size?"
  },
  {
    trigger: /timeline|schedule|implementation/i,
    response: "A realistic timeline builds trust. Break down the implementation into phases with clear milestones and deliverables. What's the expected project duration?"
  }
];

export function useAgentResponse(
  type: 'vision' | 'lead' | 'proposal',
  setDraftVision?: (updater: (prev: DraftVision) => DraftVision) => void
) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateResponse = useCallback(async (
    userMessage: string,
    previousMessages: MessageProps[]
  ): Promise<string> => {
    setIsGenerating(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    let response = '';
    let visionUpdate: Partial<DraftVision> = {};

    if (type === 'vision') {
      // Check for vision-specific triggers
      const matchedResponse = visionResponses.find(r => r.trigger.test(userMessage));
      
      if (matchedResponse) {
        response = matchedResponse.responses[Math.floor(Math.random() * matchedResponse.responses.length)];
        visionUpdate = matchedResponse.updateVision(userMessage);
        
        // Update draft vision
        if (setDraftVision && Object.keys(visionUpdate).length > 0) {
          setDraftVision(prev => ({ ...prev, ...visionUpdate }));
        }
      } else {
        // Generic vision response
        response = "I'd be happy to help you develop your company vision. Tell me about your company's purpose, values, goals, or what makes you unique.";
      }
    } else if (type === 'lead') {
      // Check for lead-specific triggers
      const matchedResponse = leadResponses.find(r => r.trigger.test(userMessage));
      response = matchedResponse?.response || 
        "I can help you manage and qualify your leads more effectively. What aspect of lead management would you like to discuss?";
    } else if (type === 'proposal') {
      // Check for proposal-specific triggers
      const matchedResponse = proposalResponses.find(r => r.trigger.test(userMessage));
      response = matchedResponse?.response || 
        "I'm here to help you create winning proposals. What part of the proposal would you like to work on?";
    }

    // Add contextual awareness based on previous messages
    if (previousMessages.length > 2) {
      response += "\n\nBased on our conversation, I can see you're making good progress. What would you like to explore next?";
    }

    setIsGenerating(false);
    return response;
  }, [type, setDraftVision]);

  return { generateResponse, isGenerating };
}