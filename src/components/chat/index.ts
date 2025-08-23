// Shared Chat Components
export { default as ChatSidebar } from './shared/ChatSidebar';
export { default as ChatWindow } from './shared/ChatWindow';
export { default as ResizableSplitter } from './shared/ResizableSplitter';
export { default as Message } from './shared/Message';
export { default as ChatInput } from './shared/ChatInput';

// Vision Chat Components
export { default as VisionChatLayout } from './chatVision/EnhancedVisionChatLayout';

// Proposal Chat Components
export { default as ProposalChatLayout } from './chatProposal/ProposalChatLayout';

// Export types from their original sources
export type { MessageProps } from './shared/Message';
export type { ChatSession } from './shared/ChatSidebar';