import React from "react";
import { spacing, fontSize, fontWeight, fontFamily, radii, shadows, lineHeight } from "../../tokens";
import {
  Container,
  SectionWrapper,
  Heading,
  Button,
  Card,
  Stack,
  Grid,
  Alert,
} from "../../primitives";

// --- Hero ---
export function HeroRenderer({ props }: { props: Record<string, unknown> }) {
  const { heading, subheading, ctaText, ctaLink, backgroundImage } = props as {
    heading?: string;
    subheading?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
  };
  return (
    <section
      style={{
        position: "relative",
        background: backgroundImage
          ? `linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 100%), url(${backgroundImage}) center/cover no-repeat`
          : "linear-gradient(135deg, var(--brand-primary, #0f2340) 0%, var(--brand-primary, #1a365d) 40%, color-mix(in srgb, var(--brand-primary, #1a365d), #4a7ab5 30%) 100%)",
        color: "#fff",
        textAlign: "center",
        padding: `${spacing["4xl"]} ${spacing.xl}`,
        overflow: "hidden",
      }}
    >
      <Container maxWidth="800px" style={{ position: "relative", zIndex: 1 }}>
        <Heading level={1} style={{
          color: "#fff",
          marginBottom: spacing.md,
          fontSize: fontSize["5xl"],
          lineHeight: lineHeight.tight,
          letterSpacing: "-0.03em",
        }}>
          {heading || "Welcome"}
        </Heading>
        {subheading && (
          <p style={{
            fontSize: fontSize.xl,
            lineHeight: lineHeight.relaxed,
            opacity: 0.88,
            margin: `0 auto ${spacing["2xl"]}`,
            maxWidth: "600px",
          }}>
            {subheading}
          </p>
        )}
        {ctaText && ctaLink && (
          <Button variant="accent" size="lg" href={ctaLink}>
            {ctaText}
          </Button>
        )}
      </Container>
    </section>
  );
}

// --- Rich Text ---
export function RichTextRenderer({ props }: { props: Record<string, unknown> }) {
  const content = (props.content as string) || "";
  const paragraphs = content.split("\n").filter((p) => p.trim());
  return (
    <SectionWrapper>
      <Container maxWidth="760px">
        <div style={{ lineHeight: lineHeight.relaxed, fontSize: fontSize.md, color: "var(--brand-text, #333)" }}>
          {paragraphs.map((paragraph, i) => {
            const isLead = i === 0 && paragraphs.length > 1;
            return (
              <p key={i} style={{
                margin: `0 0 ${spacing.lg}`,
                fontSize: isLead ? fontSize.lg : fontSize.md,
                lineHeight: lineHeight.relaxed,
                color: isLead ? "var(--brand-text, #1a1a1a)" : "var(--brand-text, #444)",
              }}>
                {paragraph}
              </p>
            );
          })}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// --- Callout ---
export function CalloutRenderer({ props }: { props: Record<string, unknown> }) {
  const { variant, title, content } = props as {
    variant?: string;
    title?: string;
    content?: string;
  };
  return (
    <SectionWrapper style={{ padding: `${spacing.xl} 0` }}>
      <Container maxWidth="760px">
        <Alert variant={(variant as "info" | "success" | "warning" | "error") || "info"} title={title}>
          {content}
        </Alert>
      </Container>
    </SectionWrapper>
  );
}

// --- CTA ---
export function CtaRenderer({ props }: { props: Record<string, unknown> }) {
  const { heading, description, buttonText, buttonLink } = props as {
    heading?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  return (
    <section
      style={{
        background: "linear-gradient(135deg, var(--brand-primary, #0f2340) 0%, var(--brand-primary, #1a365d) 50%, color-mix(in srgb, var(--brand-primary, #1a365d), #4a7ab5 30%) 100%)",
        color: "#fff",
        textAlign: "center",
        padding: `${spacing["3xl"]} ${spacing.xl}`,
      }}
    >
      <Container maxWidth="700px">
        {heading && (
          <Heading level={2} style={{ color: "#fff", marginBottom: spacing.md, fontSize: fontSize["3xl"] }}>
            {heading}
          </Heading>
        )}
        {description && (
          <p style={{ fontSize: fontSize.lg, opacity: 0.88, margin: `0 0 ${spacing["2xl"]}`, lineHeight: lineHeight.relaxed }}>
            {description}
          </p>
        )}
        {buttonText && buttonLink && (
          <Button variant="accent" size="lg" href={buttonLink}>
            {buttonText}
          </Button>
        )}
      </Container>
    </section>
  );
}

// --- Card Grid ---
export function CardGridRenderer({ props }: { props: Record<string, unknown> }) {
  const heading = props.heading as string | undefined;
  let cards: { title: string; description: string; icon?: string }[] = [];
  try {
    cards = typeof props.cards === "string" ? JSON.parse(props.cards) : (props.cards as typeof cards) ?? [];
  } catch { /* empty */ }
  return (
    <SectionWrapper background="alt">
      <Container>
        {heading && (
          <div style={{ textAlign: "center", marginBottom: spacing["2xl"] }}>
            <Heading level={2}>{heading}</Heading>
          </div>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: spacing.lg,
        }}>
          {cards.map((card, i) => (
            <Card key={i} style={{ padding: spacing.xl, textAlign: "center" }}>
              <Heading level={4} style={{ marginBottom: spacing.sm }}>{card.title}</Heading>
              <p style={{
                margin: 0,
                fontSize: fontSize.base,
                color: "var(--brand-text, #555)",
                lineHeight: lineHeight.relaxed,
              }}>
                {card.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// --- Feature List ---
export function FeatureListRenderer({ props }: { props: Record<string, unknown> }) {
  const heading = props.heading as string | undefined;
  let features: { title: string; description: string }[] = [];
  try {
    features = typeof props.features === "string" ? JSON.parse(props.features) : (props.features as typeof features) ?? [];
  } catch { /* empty */ }
  return (
    <SectionWrapper background="alt">
      <Container>
        {heading && (
          <div style={{ textAlign: "center", marginBottom: spacing["2xl"] }}>
            <Heading level={2}>{heading}</Heading>
          </div>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: spacing.lg,
        }}>
          {features.map((feature, i) => (
            <Card key={i} style={{ padding: spacing.xl }}>
              <div style={{
                width: "3rem",
                height: "3rem",
                borderRadius: radii.lg,
                backgroundColor: "color-mix(in srgb, var(--brand-primary, #1a365d), transparent 88%)",
                marginBottom: spacing.md,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: fontSize["2xl"],
                color: "var(--brand-primary, #1a365d)",
                fontWeight: fontWeight.bold,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <Heading level={4} style={{ marginBottom: spacing.sm }}>{feature.title}</Heading>
              <p style={{
                margin: 0,
                color: "var(--brand-text, #555)",
                fontSize: fontSize.base,
                lineHeight: lineHeight.relaxed,
              }}>
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// --- Two Column ---
export function TwoColumnRenderer({ props }: { props: Record<string, unknown> }) {
  const { leftContent, rightContent } = props as { leftContent?: string; rightContent?: string };
  return (
    <SectionWrapper>
      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing["2xl"],
        }}>
          <div style={{ lineHeight: lineHeight.relaxed, fontSize: fontSize.md, color: "var(--brand-text, #444)" }}>
            {(leftContent || "").split("\n").filter((p) => p.trim()).map((p, i) => (
              <p key={i} style={{ margin: `0 0 ${spacing.md}` }}>{p}</p>
            ))}
          </div>
          <div style={{ lineHeight: lineHeight.relaxed, fontSize: fontSize.md, color: "var(--brand-text, #444)" }}>
            {(rightContent || "").split("\n").filter((p) => p.trim()).map((p, i) => (
              <p key={i} style={{ margin: `0 0 ${spacing.md}` }}>{p}</p>
            ))}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}

// --- Image ---
export function ImageRenderer({ props }: { props: Record<string, unknown> }) {
  const { src, alt, caption } = props as { src?: string; alt?: string; caption?: string };
  if (!src) return null;
  return (
    <SectionWrapper>
      <Container>
        <figure style={{ margin: 0, textAlign: "center" }}>
          <img
            src={src}
            alt={alt || ""}
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: radii.lg,
              boxShadow: shadows.lg,
            }}
          />
          {caption && (
            <figcaption style={{ fontSize: fontSize.sm, color: "#777", marginTop: spacing.md, fontStyle: "italic" }}>
              {caption}
            </figcaption>
          )}
        </figure>
      </Container>
    </SectionWrapper>
  );
}

// --- FAQ ---
export function FaqRenderer({ props }: { props: Record<string, unknown> }) {
  const heading = props.heading as string | undefined;
  let items: { question: string; answer: string }[] = [];
  try {
    items = typeof props.items === "string" ? JSON.parse(props.items) : (props.items as typeof items) ?? [];
  } catch { /* empty */ }
  return (
    <SectionWrapper background="alt">
      <Container maxWidth="800px">
        {heading && (
          <div style={{ textAlign: "center", marginBottom: spacing["2xl"] }}>
            <Heading level={2}>{heading}</Heading>
          </div>
        )}
        <Stack gap={spacing.md}>
          {items.map((item, i) => (
            <div key={i} style={{
              backgroundColor: "#fff",
              borderRadius: radii.lg,
              padding: spacing.lg,
              boxShadow: shadows.sm,
            }}>
              <Heading level={4} style={{ marginBottom: spacing.sm, color: "var(--brand-text, #1a1a1a)" }}>
                {item.question}
              </Heading>
              <p style={{
                margin: 0,
                color: "var(--brand-text, #555)",
                fontSize: fontSize.md,
                lineHeight: lineHeight.relaxed,
              }}>
                {item.answer}
              </p>
            </div>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
}

// --- Stats ---
export function StatsRenderer({ props }: { props: Record<string, unknown> }) {
  let items: { value: string; label: string }[] = [];
  try {
    items = typeof props.items === "string" ? JSON.parse(props.items) : (props.items as typeof items) ?? [];
  } catch { /* empty */ }
  return (
    <SectionWrapper background="alt" style={{ textAlign: "center" }}>
      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(items.length || 1, 4)}, 1fr)`,
          gap: spacing.xl,
        }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: spacing.md }}>
              <div style={{
                fontSize: fontSize["4xl"],
                fontWeight: fontWeight.extrabold,
                color: "var(--brand-primary, #1a365d)",
                lineHeight: lineHeight.tight,
                letterSpacing: "-0.03em",
                marginBottom: spacing.xs,
              }}>
                {item.value}
              </div>
              <div style={{
                fontSize: fontSize.base,
                color: "var(--brand-text, #666)",
                fontWeight: fontWeight.medium,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// --- Section Heading ---
export function SectionHeadingRenderer({ props }: { props: Record<string, unknown> }) {
  const { heading, subheading } = props as { heading?: string; subheading?: string };
  return (
    <SectionWrapper style={{ paddingBottom: spacing.lg }}>
      <Container maxWidth="760px" style={{ textAlign: "center" }}>
        {heading && <Heading level={2}>{heading}</Heading>}
        {subheading && (
          <p style={{
            fontSize: fontSize.lg,
            color: "var(--brand-text, #555)",
            margin: `${spacing.md} 0 0`,
            lineHeight: lineHeight.relaxed,
          }}>
            {subheading}
          </p>
        )}
      </Container>
    </SectionWrapper>
  );
}

// --- Divider ---
export function DividerRenderer({ props }: { props: Record<string, unknown> }) {
  const borderStyle = (props.style as string) || "solid";
  return (
    <Container>
      <hr style={{
        border: "none",
        borderTop: `1px ${borderStyle} #e5e3de`,
        margin: `${spacing.xl} 0`,
      }} />
    </Container>
  );
}

// --- Unknown Block (fallback) ---
export function UnknownBlockRenderer({
  type,
  isAdmin,
}: {
  type: string;
  isAdmin?: boolean;
}) {
  if (!isAdmin) return null;
  return (
    <Container>
      <Alert variant="warning" title="Unknown Block">
        Block type &quot;{type}&quot; is not recognized. It may have been removed or renamed.
      </Alert>
    </Container>
  );
}
