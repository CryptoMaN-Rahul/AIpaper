import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { InlineDataPart, ModelParams, Tool, ToolConfig } from '@google/generative-ai'
import { getVisionPrompt, getFunctionCallPrompt } from '@/utils/prompt'
import { OldVisionModel } from '@/constant/model'
import { isUndefined, pick } from 'lodash-es'
import SYS_PROMPT from '@/utils/systemprompt.js'

const EXAM_ANALYZER_INSTRUCTION = SYS_PROMPT
export type RequestProps = {
  model?: string
  systemInstruction?: string
  tools?: Tool[]
  toolConfig?: ToolConfig
  messages: Message[]
  apiKey: string
  baseUrl?: string
  generationConfig: {
    topP: number
    topK: number
    temperature: number
    maxOutputTokens: number
  }
  safety: string
}

export function getSafetySettings(level: string) {
  let threshold: HarmBlockThreshold
  switch (level) {
    case 'none':
      threshold = HarmBlockThreshold.BLOCK_NONE
      break
    case 'low':
      threshold = HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
      break
    case 'middle':
      threshold = HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      break
    case 'high':
      threshold = HarmBlockThreshold.BLOCK_ONLY_HIGH
      break
    default:
      threshold = HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
      break
  }
  return [
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  ].map((category) => {
    return { category, threshold }
  })
}

export default async function chat({
  messages = [],
  systemInstruction,
  tools,
  toolConfig,
  model = 'gemini-1.5-pro',
  apiKey,
  baseUrl,
  generationConfig,
  safety,
}: RequestProps) {
  // Use exam analyzer instruction if no system instruction provided
  const finalSystemInstruction = systemInstruction || EXAM_ANALYZER_INSTRUCTION

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelParams: ModelParams = { 
    model, 
    generationConfig: {
      ...generationConfig,
      // Adjust temperature for more focused responses when using exam analyzer
      temperature: systemInstruction ? generationConfig.temperature : 0,
    }, 
    safetySettings: getSafetySettings(safety) 
  }

  // Apply system instruction based on model version
  if (finalSystemInstruction) {
    if (model.startsWith('gemini-1.5')) {
      modelParams.systemInstruction = finalSystemInstruction
    } else {
      const systemInstructionMessages = [
        { id: 'systemInstruction', role: 'user', parts: [{ text: finalSystemInstruction }] },
        { id: 'systemInstruction2', role: 'model', parts: [{ text: 'Understood. I will analyze exam papers according to these guidelines.' }] },
      ]
      messages = [...systemInstructionMessages, ...messages]
    }
  }

  // Handle tools configuration
  if (tools && !OldVisionModel.includes(model)) {
    const toolPrompt = getFunctionCallPrompt()
    modelParams.tools = tools
    modelParams.systemInstruction = modelParams.systemInstruction
      ? `${modelParams.systemInstruction}\n\n${toolPrompt}`
      : toolPrompt
    modelParams.generationConfig = {
      ...generationConfig,
      temperature: 0,
    }
    if (toolConfig) modelParams.toolConfig = toolConfig
  }

  const geminiModel = genAI.getGenerativeModel(modelParams, { baseUrl })
  const message = messages.pop()
  if (isUndefined(message)) {
    throw new Error('Request parameter error')
  }

  // Handle vision models
  if (OldVisionModel.includes(model)) {
    const textMessages: Message[] = []
    const imageMessages: InlineDataPart[] = message.parts.filter((part) =>
      part.inlineData?.mimeType.startsWith('image/'),
    ) as InlineDataPart[]
    
    for (const item of messages) {
      for (const part of item.parts) {
        if (part.text) {
          textMessages.push(item)
        } else if (part.inlineData?.mimeType.startsWith('image/')) {
          imageMessages.push(part)
        }
      }
    }
    
    const prompt = getVisionPrompt(message, textMessages)
    if (imageMessages.length > 16) {
      throw new Error('Limited to 16 pictures')
    }
    const { stream } = await geminiModel.generateContentStream([prompt, ...imageMessages])
    return stream
  } else {
    // Regular chat handling
    const chat = geminiModel.startChat({
      history: messages.map((item) => pick(item, ['role', 'parts'])),
    })
    const { stream } = await chat.sendMessageStream(message.parts)
    return stream
  }
}
