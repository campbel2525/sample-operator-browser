import { fileToDataUrl } from '@services/file_service'
import { chat } from '@services/chat_service'
import { AiInstruction } from '@definitions/types'
import * as readline from 'readline'
import {
  launchBrowser,
  takeFullPageScreenshot,
  getBodyHtml,
} from '@services/browser_service'
import { PROMPT_LOG_DIR } from '@config/settings'
import { Page } from 'playwright'
import * as fs from 'fs'
import { ChatMessage } from '@definitions/types' // ChatMessageをインポート

// ■■■■ AI に JSON命令配列を返してもらうためのシステムプロンプト ■■■■
// 特定のWebサイト専用: ボタンX,Y,Zそれぞれのセレクタを提示
export const BASE_BROWSER_RULE = `
# ルール
1. 返すメッセージは必ず【JSON配列だけ】にし、余計な説明は一切しないこと。
2. JSON配列の各要素は以下のいずれかの形式のJSONオブジェクトにすること：
   - {"click": "CSSセレクタ"}
   - {"wait": ミリ秒数}
   - {"goto": "URL"}
   - {"fill": {"selector": "CSSセレクタ", "text": "入力テキスト"}}
3. 必ず配列で返すこと。単一の操作でも配列形式で返すこと。複数の操作を順番に実行したい場合は配列に複数の操作を含めること。
   例：[{"click": ".button-x"}, {"wait": 1000}, {"fill": {"selector": "#input", "text": "テスト"}}, {"click": ".submit"}]
4. ユーザーが入力した操作(X, Y, Z)に応じて、上記に定義した該当のセレクタのみを返し、絶対に他のセレクタは返さないこと。
   例：ユーザーが「X」と入力したら [{"click": ".button-x"}] を返す。
5. ページ操作を行った結果、次にAIが判断するべきログインや追加入力、別の操作指示など
   "再度ユーザー入力が必要" とAIが判断した場合は、必ず [{"done": true}] を返して止めること。
6. 単一の操作でも必ず配列形式で返すこと。{"done": true} ではなく [{"done": true}] を返す。
7. 上記以外の形式や余計な文章を絶対に返さないこと。
`

/**
 * 標準入力からユーザーの入力を待つ関数
 */
export function askUserPrompt(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question('実行の準備ができた場合はenterを押してください: ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * ループ内の1回分の処理を行う関数
 */
export async function processOnceOfAiCallBack(
  page: Page,
  prompt: string
): Promise<void> {
  // 1. スクリーンショット取得
  const screenshotPath = await takeFullPageScreenshot(page)
  const dataUrl = await fileToDataUrl(screenshotPath)

  // 2. HTML取得（必要なら）
  const fullHtml = await getBodyHtml(page)
  // 過度に長くならないよう制限
  const MAX_HTML_LENGTH = 5000
  const bodyHtml =
    fullHtml.length > MAX_HTML_LENGTH
      ? fullHtml.slice(0, MAX_HTML_LENGTH) + '…'
      : fullHtml

  // 3. human メッセージ作成
  const userPrompt =
    prompt +
    `
# ブラウザのhtml
\`\`\`
${bodyHtml}
\`\`\`
`
  const messages: ChatMessage[] = [
    {
      role: 'human',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ]

  // 4. AI に問い合わせ
  const aiRaw = await chat(messages)

  console.log('------------------------')
  console.log(aiRaw)
  console.log('------------------------')

  // promptのログ
  messages.push({
    role: 'assistant',
    content: aiRaw,
  })
  const logFilePath = `${PROMPT_LOG_DIR}/browser_prompt_${Date.now()}.json`
  // const fs = require('fs')
  fs.writeFileSync(logFilePath, JSON.stringify(messages, null, 2))

  // 5. JSON.parse
  const instruction: AiInstruction = JSON.parse(
    aiRaw
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```$/, '')
  )

  // 6. 命令を実行（複数操作対応）
  // try {
  // let isDone = false

  for (let i = 0; i < instruction.length; i++) {
    const singleInstruction = instruction[i]
    console.log(`→ AI命令 ${i + 1}/${instruction.length}:`)

    if ('click' in singleInstruction) {
      const selector = singleInstruction.click
      console.log(`  クリック → セレクタ = ${selector}`)
      await page.click(selector)
    } else if ('wait' in singleInstruction) {
      const ms = singleInstruction.wait
      console.log(`  待機 → ${ms}ms`)
      await page.waitForTimeout(ms)
    } else if ('goto' in singleInstruction) {
      const url = singleInstruction.goto
      console.log(`  ページ移動 → URL = ${url}`)
      await page.goto(url)
    } else if ('fill' in singleInstruction) {
      const { selector, text } = singleInstruction.fill
      console.log(`  入力 → セレクタ = ${selector}, テキスト = ${text}`)
      await page.fill(selector, text)
    } else if (
      'screenshot' in singleInstruction &&
      singleInstruction.screenshot
    ) {
      console.log(`  スクリーンショット取得`)
      await takeFullPageScreenshot(page)
    }
  }
  // else if ("done" in singleInstruction && singleInstruction.done) {
  //   console.log("▶ AI が操作完了と判断しました。");
  //   isDone = true;
  //   break;
  // }
  // }

  // // 7. 成功した JSON命令のみ履歴に追加
  // if (!isDone) {
  //   chatHistory.push({ role: "assistant", content: aiRaw });
  // }

  // } catch (e) {
  //   console.error("‼ 操作中にエラー発生:", e);

  // }
}

/**
 * processOnceCallback: コールバック関数
 */
export async function operatorBrowser(
  processOnceCallback: (page: Page) => Promise<void>
): Promise<void> {
  const { browser, page } = await launchBrowser(false)

  while (true) {
    try {
      const userInput = await askUserPrompt()
      if (userInput.toLowerCase() === 'exit') break

      // 操作ループ
      let errorCount = 0
      while (true) {
        try {
          await processOnceCallback(page)
          errorCount = 0
        } catch (err) {
          console.error('ループ内で予期せぬエラー:', err)
          errorCount++
          if (errorCount >= 3) {
            console.error('3回連続エラーで中断')
            break
          }
        }
      }
      console.log('終了しました')
    } catch (err) {
      console.error('エラー発生2:', err)
      break
    }
  }

  console.log('全ての処理を終了。ブラウザを閉じます。')
  await browser.close()
}
