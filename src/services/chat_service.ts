// src/services/chat_service.ts
import * as dotenv from 'dotenv'
import { ChatMessage } from '@definitions/types' // ■■ ChatMessageをインポート

dotenv.config()

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage } from '@langchain/core/messages'
// import { DEFAULT_OPEN_AI_MODEL } from "@config/settings";

function createChatModel(
  modelName: string,
  apiKey: string = process.env.OPENAI_API_KEY!
): ChatOpenAI {
  return new ChatOpenAI({
    model: modelName,
    apiKey,
    // temperature: 0.7,
    // maxTokens: 1000,
  })
}

/**
 * GPT へメッセージを投げる
 *
 * @param messages any[] の配列
 *   - text のみの場合: content="こんにちは"
 *   - 画像を含む場合: content=[{ type:"text", text:"..." }, { type:"image_url", image_url:{ url:"..." } }]
 * @param modelName 省略可。DEFAULT_OPEN_AI_MODEL が使われる
 * @returns GPT の応答テキスト
 *
 * テキストのみの場合
 * ```
 * [
 *     {
 *         "role": "human",
 *         "content": "こんにちは"
 *     }
 * ]
 * ```
 *
 * テキストと画像の場合
 * ```
 * [
 *     {
 *         "role":"human",
 *         "content":[
 *             {
 *                 "type": "text",
 *                 "text": "画像に書かれている文字は何ですか？書いている文字だけ教えてください"
 *             },
 *             {
 *                 "type": "image_url",
 *                 "image_url": {
 *                     #画像のURL、URLベースのbase64
 *                     "url": "IMG_URL"
 *                 }
 *             }
 *         ]
 *     }
 * ]
 * ```
 */
export async function chat(
  messages: ChatMessage[],
  modelName: string = process.env.OPENAI_AI_MODEL!
): Promise<string> {
  const chatModel = createChatModel(modelName)
  const aiResponse: AIMessage = await chatModel.invoke(
    messages as ChatMessage[]
  )
  return aiResponse.text
}

export async function chat_response_json(
  messages: ChatMessage[],
  modelName: string = process.env.OPENAI_AI_MODEL!
): Promise<string> {
  const answer = await chat(messages, modelName)

  try {
    const instruction = JSON.parse(
      answer
        .trim()
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '')
    )

    return instruction
  } catch (e) {
    console.error(e)
    throw new Error('AIの返答をJSONとして解釈できませんでした ' + answer)
  }
}
