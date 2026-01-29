import { getProviderConfig } from '@/lib/llm-providers'
import type { LLMProviderType, Tool } from '@/types'
import type { ChatMessage, ToolCall } from '@/stores/useChatStore'

export interface ChatConfig {
  provider: LLMProviderType
  apiKey: string
  baseUrl: string
  model: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onToolCall: (toolCall: ToolCall) => void
  onComplete: () => void
  onError: (error: Error) => void
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | Array<{
    type: 'text' | 'tool_use' | 'tool_result'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
    tool_use_id?: string
    content?: string
  }>
}

// Convert Tool to OpenAI function format
export function toolToOpenAIFunction(tool: Tool): {
  type: 'function'
  function: ToolDefinition
} {
  const properties: Record<string, { type: string; description: string }> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type === 'integer' ? 'integer' : param.type === 'number' ? 'number' : 'string',
      description: param.description || param.name,
    }
    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  }
}

// Convert Tool to Anthropic tool format
export function toolToAnthropicTool(tool: Tool): {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
} {
  const properties: Record<string, { type: string; description: string }> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type === 'integer' ? 'integer' : param.type === 'number' ? 'number' : 'string',
      description: param.description || param.name,
    }
    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  }
}

function formatMessagesForProvider(
  messages: ChatMessage[],
  provider: LLMProviderType
): OpenAIMessage[] | AnthropicMessage[] {
  if (provider === 'anthropic') {
    const anthropicMessages: AnthropicMessage[] = []

    for (const msg of messages) {
      if (msg.role === 'tool') {
        // Tool results need to be attached to the previous assistant message or as user message
        const lastMsg = anthropicMessages[anthropicMessages.length - 1]
        if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          lastMsg.content.push({
            type: 'tool_result',
            tool_use_id: msg.toolCallId || '',
            content: msg.content,
          })
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.toolCallId || '',
              content: msg.content,
            }],
          })
        }
      } else if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const content: AnthropicMessage['content'] = []
        if (msg.content) {
          content.push({ type: 'text', text: msg.content })
        }
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })
        }
        anthropicMessages.push({ role: 'assistant', content })
      } else if ((msg.role as string) !== 'tool') {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    return anthropicMessages
  }

  // OpenAI format
  const openaiMessages: OpenAIMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'tool') {
      openaiMessages.push({
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId,
      })
    } else if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      openaiMessages.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      })
    } else {
      openaiMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }
  }

  return openaiMessages
}

function buildHeaders(config: ChatConfig): HeadersInit {
  const providerConfig = getProviderConfig(config.provider)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  switch (providerConfig.authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${config.apiKey}`
      break
    case 'custom-header':
      if (providerConfig.authHeader) {
        headers[providerConfig.authHeader] = config.apiKey
      }
      break
    case 'query-param':
      // Handled in URL
      break
  }

  if (config.provider === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  return headers
}

function buildEndpoint(config: ChatConfig): string {
  const providerConfig = getProviderConfig(config.provider)
  let endpoint = config.baseUrl

  if (config.provider === 'anthropic') {
    endpoint += '/v1/messages'
  } else if (config.provider === 'google') {
    endpoint += `/v1beta/models/${config.model}:streamGenerateContent?alt=sse`
    if (providerConfig.authType === 'query-param') {
      endpoint += `&key=${config.apiKey}`
    }
  } else {
    endpoint += '/v1/chat/completions'
  }

  return endpoint
}

function buildRequestBody(
  messages: ChatMessage[],
  config: ChatConfig,
  tools?: Tool[]
): string {
  const hasTools = tools && tools.length > 0

  if (config.provider === 'anthropic') {
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: 4096,
      messages: formatMessagesForProvider(messages, config.provider),
      stream: true,
    }

    if (hasTools) {
      body.tools = tools.map(toolToAnthropicTool)
    }

    return JSON.stringify(body)
  }

  if (config.provider === 'google') {
    const contents = messages
      .filter(msg => msg.role !== 'tool')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

    return JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 4096,
      },
    })
  }

  // OpenAI and compatible providers
  const body: Record<string, unknown> = {
    model: config.model,
    messages: formatMessagesForProvider(messages, config.provider),
    stream: true,
  }

  if (hasTools) {
    body.tools = tools.map(toolToOpenAIFunction)
    body.tool_choice = 'auto'
  }

  return JSON.stringify(body)
}

interface ToolCallAccumulator {
  id: string
  name: string
  arguments: string
}

async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  provider: LLMProviderType,
  callbacks: StreamCallbacks
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallAccumulators: Map<number, ToolCallAccumulator> = new Map()
  let currentToolUseId = ''
  let currentToolUseName = ''
  let currentToolUseInput = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Emit any accumulated tool calls
        for (const [, acc] of toolCallAccumulators) {
          try {
            const args = JSON.parse(acc.arguments || '{}')
            callbacks.onToolCall({
              id: acc.id,
              name: acc.name,
              arguments: args,
              status: 'pending',
            })
          } catch {
            // Invalid JSON arguments
          }
        }

        // For Anthropic, emit accumulated tool use
        if (provider === 'anthropic' && currentToolUseId && currentToolUseName) {
          try {
            const args = JSON.parse(currentToolUseInput || '{}')
            callbacks.onToolCall({
              id: currentToolUseId,
              name: currentToolUseName,
              arguments: args,
              status: 'pending',
            })
          } catch {
            // Invalid JSON arguments
          }
        }

        callbacks.onComplete()
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()

        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue
        }

        if (!trimmedLine.startsWith('data: ')) {
          continue
        }

        const jsonStr = trimmedLine.slice(6)

        try {
          const data = JSON.parse(jsonStr)

          if (provider === 'anthropic') {
            // Handle Anthropic streaming format
            if (data.type === 'content_block_start') {
              if (data.content_block?.type === 'tool_use') {
                currentToolUseId = data.content_block.id || ''
                currentToolUseName = data.content_block.name || ''
                currentToolUseInput = ''
              }
            } else if (data.type === 'content_block_delta') {
              if (data.delta?.type === 'text_delta') {
                callbacks.onToken(data.delta.text || '')
              } else if (data.delta?.type === 'input_json_delta') {
                currentToolUseInput += data.delta.partial_json || ''
              }
            } else if (data.type === 'content_block_stop') {
              if (currentToolUseId && currentToolUseName) {
                try {
                  const args = JSON.parse(currentToolUseInput || '{}')
                  callbacks.onToolCall({
                    id: currentToolUseId,
                    name: currentToolUseName,
                    arguments: args,
                    status: 'pending',
                  })
                } catch {
                  // Invalid JSON
                }
                currentToolUseId = ''
                currentToolUseName = ''
                currentToolUseInput = ''
              }
            }
          } else if (provider === 'google') {
            const token = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (token) {
              callbacks.onToken(token)
            }
          } else {
            // OpenAI and compatible providers
            const choice = data.choices?.[0]
            const delta = choice?.delta

            // Handle text content
            if (delta?.content) {
              callbacks.onToken(delta.content)
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? 0

                if (!toolCallAccumulators.has(index)) {
                  toolCallAccumulators.set(index, {
                    id: tc.id || '',
                    name: tc.function?.name || '',
                    arguments: '',
                  })
                }

                const acc = toolCallAccumulators.get(index)!
                if (tc.id) acc.id = tc.id
                if (tc.function?.name) acc.name = tc.function.name
                if (tc.function?.arguments) acc.arguments += tc.function.arguments
              }
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
  config: ChatConfig,
  callbacks: StreamCallbacks,
  tools?: Tool[]
): Promise<void> {
  const endpoint = buildEndpoint(config)
  const headers = buildHeaders(config)
  const body = buildRequestBody(messages, config, tools)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage
      } catch {
        if (errorText) {
          errorMessage = errorText
        }
      }

      throw new Error(errorMessage)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    await parseSSEStream(reader, config.provider, callbacks)
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const chatApi = {
  sendMessage: sendChatMessage,
}
