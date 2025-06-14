// src/services/browserService.ts

import { Browser, BrowserContext, Page, chromium } from "playwright";
import * as path from "path";
import { SCREENSHOT_DIR } from "@config/settings";

import { AiSingleInstruction } from "@definitions/types";

/**
 * Chromium ブラウザを起動し、Browser/Context/Page を返す。
 * @param headless   ヘッドレスモードにするなら true。デフォルトは false（GUI 表示）。
 * @returns { browser, context, page }
 */
export async function launchBrowser(
  headless = false
): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * ページ全体のスクリーンショットを撮影し、プロジェクトルート直下の screenshots/ に保存する。
 * ブラウザは閉じない。
 *
 * @param page      Playwright の Page オブジェクト
 * @param fileName 保存するファイル名（例: "google-home.png"）
 */
export async function takeFullPageScreenshot(
  page: Page,
  saveDir: string = SCREENSHOT_DIR,
  fileName: string = ""
): Promise<string> {
  // process.cwd() は「node コマンドを実行したディレクトリ（プロジェクトルート）」を返す
  const outputDir = path.join(process.cwd(), saveDir);


  if (!fileName) {
    // ファイル名が指定されていない場合は、現在の日時を使ってファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    fileName = `screenshot-${timestamp}.png`;
  }

  const filePath = path.join(outputDir, fileName);

  await page.screenshot({ path: filePath, fullPage: true });

  return filePath;
}

/**
 * AI 命令（goto/click/fill/wait/screenshot/done）を受け取り、
 * Playwright の Page に対して該当操作を行う
 *
 * @param page        Playwright の Page オブジェクト
 * @param instruction AI から返ってくる命令オブジェクト
 *    - { goto: string }
 *    - { click: string }
 *    - { fill: { selector: string; text: string } }
 *    - { wait: number }
 *    - { screenshot: boolean }
 *    - { done: boolean }
 * @returns           true を返した場合、AI命令が { done: true } で「完了指示」だったことを示す
 */
export async function applyAiInstruction(
  page: Page,
  instruction: AiSingleInstruction
): Promise<boolean> {
  // 「done: true」があれば、ループを抜けるシグナルとして true を返す
  if ("done" in instruction && instruction.done === true) {
    console.log("→ AI命令: done = true（操作終了指示）");
    return true;
  }

  // goto
  if ("goto" in instruction) {
    const url: string = instruction.goto;
    console.log(`→ AI命令: ページ移動 → ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    return false;
  }

  // click
  if ("click" in instruction) {
    const selector: string = instruction.click;
    console.log(`→ AI命令: クリック → セレクタ = ${selector}`);
    await page.waitForSelector(selector, { state: "visible" });
    await page.click(selector);
    return false;
  }

  // fill
  if ("fill" in instruction) {
    const { selector, text }: { selector: string; text: string } = instruction.fill;
    console.log(`→ AI命令: フォーム入力 → セレクタ = ${selector} ／ テキスト = ${text}`);
    await page.waitForSelector(selector, { state: "visible" });
    await page.fill(selector, text);
    return false;
  }

  // wait
  if ("wait" in instruction) {
    const ms: number = instruction.wait;
    console.log(`→ AI命令: 待機 → ${ms} ミリ秒`);
    await page.waitForTimeout(ms);
    return false;
  }

  // screenshot
  if ("screenshot" in instruction) {
    const doShot: boolean = instruction.screenshot;
    if (doShot) {
      const pathTaken = await takeFullPageScreenshot(page);
      console.log(`→ AI命令: スクリーンショット取得 → ${pathTaken}`);
    } else {
      console.log("→ AI命令: screenshot = false（何もしない）");
    }
    return false;
  }

  // ここまでどれにも該当しなかったら警告を出す
  console.warn("‼ 未知の AI命令が来ました:", instruction);
  return false;
}

/**
 * ページの<body>要素のHTMLを取得する関数
 * @param page PlaywrightのPageオブジェクト
 * @returns body要素のHTML文字列
 */
export async function getBodyHtml(page: Page): Promise<string> {
  return await page.$eval("body", el => el.outerHTML);
}
