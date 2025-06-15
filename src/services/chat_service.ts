import * as dotenv from 'dotenv'
import { ChatMessage } from '@definitions/types'

dotenv.config()

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage } from '@langchain/core/messages'

/**
 * ChatOpenAIモデルを作成する
 * @param modelName 使用するモデル名
 * @param apiKey OpenAI APIキー（デフォルトは環境変数から取得）
 * @returns ChatOpenAIインスタンス
 */
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
 * OpenAI ChatGPTにメッセージを送信し、応答を取得する
 * @param messages チャットメッセージの配列（テキストまたは画像を含む）
 * @param modelName 使用するモデル名（デフォルトは環境変数から取得）
 * @returns AIの応答テキスト
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

/**
 * AIからJSON形式の応答を取得し、パースして返す
 * @param messages チャットメッセージの配列
 * @param modelName 使用するモデル名（デフォルトは環境変数から取得）
 * @returns パース済みのJSONオブジェクト
 */
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
