import { notFound } from "next/navigation";
import { publicApiFetch } from "../../../lib/api-client";
import { BlockRenderer } from "@club-os/ui-kit";
import type { PageBlock } from "@club-os/domain-core";

interface PublicContentPage {
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
  contentFormat?: string;
  blocks?: PageBlock[];
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

  if (page.contentFormat === "blocks_v1" && page.blocks && page.blocks.length > 0) {
    return (
      <article className="content-page">
        <BlockRenderer blocks={page.blocks} />
      </article>
    );
  }

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
