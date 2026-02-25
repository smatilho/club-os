import { apiFetch } from "../../../lib/api-client";

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
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "2px",
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
        padding: "0.125rem 0.4rem",
        fontSize: "0.625rem",
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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function CommunityFeedPage() {
  let posts: Post[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<Post[]>("/api/community/posts");
    if (result.ok) {
      posts = result.data;
    } else {
      error = result.error;
    }
  } catch {
    error = "Unable to connect to API";
  }

  return (
    <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600&display=swap');`}</style>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: 0,
              color: "#2d2235",
            }}
          >
            Community
          </h1>
          <p
            style={{
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.8125rem",
              color: "#7a6e85",
              margin: "0.375rem 0 0",
            }}
          >
            {posts.length} conversation{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/member/community/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1.25rem",
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#6d4c9f",
            border: "none",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          + New Post
        </a>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "4px",
            color: "#dc3c3c",
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {posts.length === 0 && !error ? (
        <div
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            backgroundColor: "rgba(140,100,200,0.04)",
            borderRadius: "12px",
            border: "1px dashed rgba(140,100,200,0.2)",
          }}
        >
          <div
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.125rem",
              color: "#2d2235",
              marginBottom: "0.5rem",
            }}
          >
            No posts yet
          </div>
          <p
            style={{
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              color: "#7a6e85",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            Start a conversation!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {posts.map((post) => {
            const isHidden = post.status === "hidden";
            const isDeleted = post.status === "deleted";
            const isRedacted = isHidden || isDeleted;

            return (
              <a
                key={post.id}
                href={isDeleted ? undefined : `/member/community/posts/${post.id}`}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  backgroundColor: isRedacted ? "#faf8f5" : "#fff",
                  borderRadius: "8px",
                  border: `1px solid ${isRedacted ? "rgba(200,180,160,0.3)" : "#e9ecef"}`,
                  textDecoration: "none",
                  color: "inherit",
                  opacity: isDeleted ? 0.6 : 1,
                  cursor: isDeleted ? "default" : "pointer",
                }}
              >
                {isRedacted ? (
                  <div
                    style={{
                      fontFamily: "'Source Sans 3', system-ui, sans-serif",
                      fontSize: "0.8125rem",
                      fontStyle: "italic",
                      color: "#998a7a",
                    }}
                  >
                    {isDeleted
                      ? "[This post has been removed]"
                      : "[This post has been hidden by a moderator]"}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Libre Baskerville', Georgia, serif",
                            fontWeight: 700,
                            fontSize: "0.9375rem",
                            color: "#2d2235",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {post.title}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Source Sans 3', system-ui, sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.75rem",
                            color: "#7a6e85",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{post.authorUserId}</span>
                          <span style={{ color: "#c4bdd0" }}>&middot;</span>
                          <span>{relativeTime(post.createdAt)}</span>
                          <span style={{ color: "#c4bdd0" }}>&middot;</span>
                          <span>
                            {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {post.status !== "visible" && (
                        <StatusBadge status={post.status} />
                      )}
                    </div>
                    {post.tags.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.375rem",
                          marginTop: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {post.tags.map((tag) => (
                          <TagPill key={tag} tag={tag} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
