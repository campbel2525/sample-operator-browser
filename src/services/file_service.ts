// src/services/fileService.ts

import * as fs from 'fs'
import * as path from 'path'

/**
 * 拡張子から簡易的に MIME タイプを返す関数
 * 必要に応じて項目を追加してください。
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.mp3':
      return 'audio/mpeg'
    case '.json':
      return 'application/json'
    case '.html':
      return 'text/html'
    case '.css':
      return 'text/css'
    case '.js':
      return 'text/javascript'
    case '.pdf':
      return 'application/pdf'
    // 必要に応じて他の拡張子を追加…
    default:
      return 'application/octet-stream'
  }
}

/**
 * 指定されたファイルを読み込み、
 * Data URL（<img> の src として使える形式）に変換して返す
 */
export async function fileToDataUrl(filePath: string): Promise<string> {
  // ① 絶対パスに解決
  const resolvedPath = path.resolve(filePath)

  // ② ファイルをバイナリとして読み込む
  const data = await fs.promises.readFile(resolvedPath)

  // ③ 読み込んだバッファを Base64 文字列に変換
  const base64 = data.toString('base64')

  // ④ 拡張子ベースで MIME タイプを判定
  const mimeType = getMimeType(resolvedPath)

  // ⑤ data URL 形式で返す
  return `data:${mimeType};base64,${base64}`
}
