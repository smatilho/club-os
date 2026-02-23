import { notFound } from "next/navigation";
import { publicApiFetch } from "../../../lib/api-client";

interface PublicContentPage {
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
}

export default async function PublicContentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");

  const result = await publicApiFetch<PublicContentPage>(
    `/api/content/public/pages/${slugPath}`,
  );

  if (!result.ok) {
    notFound();
  }

  const page = result.data;

  return (
    <article className="content-page">
      <h1>{page.title}</h1>
      <div className="content-body">{page.body}</div>
      <footer className="content-meta">
        <time dateTime={page.publishedAt}>
          {new Date(page.publishedAt).toLocaleDateString()}
        </time>
      </footer>
    </article>
  );
}
