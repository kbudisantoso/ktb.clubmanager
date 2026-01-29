import ReactMarkdown from "react-markdown"
import { getMarkdownContent } from "@/lib/markdown"
import { PublicPageLayout } from "@/components/layout/public-page-layout"

export const metadata = {
  title: "Impressum | ClubManager",
  description: "Impressum und rechtliche Hinweise",
}

export default async function ImpressumPage() {
  const content = await getMarkdownContent("impressum.md")

  return (
    <PublicPageLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </PublicPageLayout>
  )
}
