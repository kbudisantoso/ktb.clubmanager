import ReactMarkdown from 'react-markdown'
import { getMarkdownContent } from '@/lib/markdown'
import Link from 'next/link'

export const metadata = {
  title: 'Datenschutzerklarung | ktb.clubmanager',
  description: 'Datenschutzerklarung und Informationen zur Datenverarbeitung',
}

export default async function DatenschutzPage() {
  const content = await getMarkdownContent('datenschutz.md')

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <article className="prose prose-neutral dark:prose-invert prose-headings:font-display">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>

      <footer className="mt-12 pt-8 border-t text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">
          &larr; Zuruck zur Anmeldung
        </Link>
      </footer>
    </div>
  )
}
