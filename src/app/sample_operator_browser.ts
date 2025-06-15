import {
  operatorBrowser,
  BASE_BROWSER_RULE,
  processOnceOfAiCallBack,
} from '@app/base_operator_browser'
import { Page } from 'playwright'

/**
 * サンプルブラウザ操作のメイン関数
 * 背景色に応じてボタンをクリックするAI操作を実行する
 */
async function main() {
  const prompt = `
あなたは"ブラウザ操作を指示するAI"です。
ルールを守りながら、操作内容を実行するための命令を返してください。

またユーザーが添付画像とブラウザのhtmlを添付します

# 操作内容
- 背景が白場合はセレクタ".button-x"のボタンをクリック
- 背景が青色の場合はセレクタ".button-y"のボタンをクリック
- 背景が黄色の場合はセレクタ".button-z"のボタンをクリック
- 背景が赤色の場合はセレクタ".button-x"のボタンをクリック

${BASE_BROWSER_RULE}
`

  const callback = (page: Page) => processOnceOfAiCallBack(page, prompt)
  await operatorBrowser(callback)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
