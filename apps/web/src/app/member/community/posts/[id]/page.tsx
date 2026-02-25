import { apiFetch } from "@/lib/api-client";
import { notFound } from "next/navigation";
import CommentForm from "./comment-form";
import ReportButton from "./report-button";

interface Post {
  id: string;
  title: string;
  body: string;
  authorUserId: string;
  tags: string[];
  status: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    visible: {
      bg: "rgba(80,180,100,0.12)",
      fg: "#50b464",
      border: "rgba(80,180,100,0.25)",
    },
    hidden: {
      bg: "rgba(200,165,90,0.12)",
      fg: "#c8a55a",
      border: "rgba(200,165,90,0.25)",
    },
    locked: {
      bg: "rgba(120,120,120,0.1)",
      fg: "#888",
      border: "rgba(120,120,120,0.2)",
    },
    deleted: {
      bg: "rgba(220,60,60,0.08)",
      fg: "#dc3c3c",
      border: "rgba(220,60,60,0.2)",
    },
  };
  const fallback = {
    bg: "rgba(100,140,220,0.12)",
    fg: "#648cdc",
    border: "rgba(100,140,220,0.25)",
  };
  const c = colors[status] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "4px",
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {status}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "0.02em",
        borderRadius: "9999px",
        backgroundColor: "rgba(140,100,200,0.1)",
        color: "#7c5cbf",
        border: "1px solid rgba(140,100,200,0.2)",
      }}
    >
      {tag}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [postResult, commentsResult] = await Promise.all([
    apiFetch<Post>(`/api/community/posts/${id}`),
    apiFetch<Comment[]>(`/api/community/posts/${id}/comments`),
  ]);

  if (!postResult.ok) {
    notFound();
  }

  const post = postResult.data;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const commentsError = !commentsResult.ok ? commentsResult.error : null;

  const isLocked = post.status === "locked";

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;500;600&display=swap');`}</style>

      <a
        href="/member/community"
        style={{
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
          fontSize: "0.8125rem",
          color: "#6d4c9f",
          textDecoration: "none",
          marginBottom: "1.25rem",
          display: "inline-block",
        }}
      >
        &larr; Back to Community
      </a>

      {/* Post card */}
      <article
        style={{
          padding: "2rem",
          backgroundColor: "#fff",
          borderRadius: "12px",
          border: "1px solid #e9ecef",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h1
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#2d2235",
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {post.title}
          </h1>
          {post.status !== "visible" && <StatusBadge status={post.status} />}
        </div>

        <div
          style={{
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            color: "#7a6e85",
            marginBottom: "1.5rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "#4a3d5c" }}>
            {post.authorUserId}
          </span>
          <span style={{ color: "#c4bdd0" }}>&middot;</span>
          <span>{formatDate(post.createdAt)}</span>
        </div>

        <div
          style={{
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.9375rem",
            lineHeight: 1.7,
            color: "#3a3145",
            whiteSpace: "pre-wrap",
            marginBottom: "1.5rem",
          }}
        >
          {post.body}
        </div>

        {post.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "0.375rem",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
            }}
          >
            {post.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "1rem",
            borderTop: "1px solid #f0edf3",
          }}
        >
          <span
            style={{
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.75rem",
              color: "#a097ab",
            }}
          >
            {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
          </span>
          <ReportButton
            type="post"
            targetId={post.id}
            postId={post.id}
          />
        </div>
      </article>

      {/* Comments section */}
      <section>
        <h2
          style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#2d2235",
            marginBottom: "1rem",
          }}
        >
          Discussion
        </h2>

        {commentsError && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(220,60,60,0.08)",
              border: "1px solid rgba(220,60,60,0.2)",
              borderRadius: "6px",
              color: "#dc3c3c",
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.8125rem",
              marginBottom: "1rem",
            }}
          >
            {commentsError}
          </div>
        )}

        {comments.length === 0 && !commentsError ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "rgba(140,100,200,0.03)",
              borderRadius: "8px",
              border: "1px dashed rgba(140,100,200,0.15)",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.8125rem",
                color: "#a097ab",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              No comments yet. Be the first to reply.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            {comments.map((comment) => {
              const isHidden = comment.status === "hidden";

              return (
                <div
                  key={comment.id}
                  style={{
                    padding: "1rem 1.25rem",
                    backgroundColor: isHidden ? "#faf8f5" : "#fff",
                    borderRadius: "8px",
                    border: `1px solid ${isHidden ? "rgba(200,180,160,0.3)" : "#e9ecef"}`,
                  }}
                >
                  {isHidden ? (
                    <div
                      style={{
                        fontFamily: "'Source Sans 3', system-ui, sans-serif",
                        fontSize: "0.8125rem",
                        fontStyle: "italic",
                        color: "#998a7a",
                      }}
                    >
                      [Comment hidden by moderator]
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontFamily: "'Source Sans 3', system-ui, sans-serif",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.75rem",
                            color: "#7a6e85",
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#4a3d5c" }}>
                            {comment.authorUserId}
                          </span>
                          <span style={{ color: "#c4bdd0" }}>&middot;</span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <ReportButton
                          type="comment"
                          targetId={comment.id}
                          postId={post.id}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "'Source Sans 3', system-ui, sans-serif",
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                          color: "#3a3145",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {comment.body}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Comment form or locked notice */}
        {isLocked ? (
          <div
            style={{
              padding: "1.25rem",
              textAlign: "center",
              backgroundColor: "rgba(120,120,120,0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(120,120,120,0.15)",
            }}
          >
            <p
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.8125rem",
                color: "#888",
                margin: 0,
              }}
            >
              This conversation has been locked. New comments are not allowed.
            </p>
          </div>
        ) : (
          <CommentForm postId={post.id} />
        )}
      </section>
    </div>
  );
}
