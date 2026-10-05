import 'server-only';
// Provider registry: adding a new assistant means adding an adapter and an entry here.
import { gemini } from './gemini';
import { claude } from './claude';
import { openai } from './openai';
import type { AiProvider, AiProviderId } from './types';

const registry: Record<AiProviderId, AiProvider> = { gemini, claude, openai };

export const getProvider = (id: AiProviderId): AiProvider => registry[id];

export { AiProviderError } from './types';
export type { AiProvider, AiProviderId, AiTool, AiToolCall } from './types';
