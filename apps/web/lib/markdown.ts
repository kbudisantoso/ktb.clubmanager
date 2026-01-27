import { readFile } from 'fs/promises'
import { join } from 'path'

export async function getMarkdownContent(filename: string): Promise<string> {
  const filePath = join(process.cwd(), 'content', filename)
  return readFile(filePath, 'utf-8')
}
