import React from "react";
import type { PageBlock } from "@club-os/domain-core";
import {
  HeroRenderer,
  RichTextRenderer,
  CalloutRenderer,
  CtaRenderer,
  CardGridRenderer,
  FeatureListRenderer,
  TwoColumnRenderer,
  ImageRenderer,
  FaqRenderer,
  StatsRenderer,
  SectionHeadingRenderer,
  DividerRenderer,
  UnknownBlockRenderer,
} from "./renderers";

const RENDERER_MAP: Record<
  string,
  React.ComponentType<{ props: Record<string, unknown> }>
> = {
  hero: HeroRenderer,
  rich_text: RichTextRenderer,
  callout: CalloutRenderer,
  cta: CtaRenderer,
  card_grid: CardGridRenderer,
  feature_list: FeatureListRenderer,
  two_column: TwoColumnRenderer,
  image: ImageRenderer,
  faq: FaqRenderer,
  stats: StatsRenderer,
  section_heading: SectionHeadingRenderer,
  divider: DividerRenderer,
};

export function BlockRenderer({
  blocks,
  isAdmin = false,
}: {
  blocks: PageBlock[];
  isAdmin?: boolean;
}) {
  return (
    <>
      {blocks.map((block) => {
        const Renderer = RENDERER_MAP[block.type];
        if (!Renderer) {
          return (
            <UnknownBlockRenderer
              key={block.id}
              type={block.type}
              isAdmin={isAdmin}
            />
          );
        }
        return <Renderer key={block.id} props={block.props} />;
      })}
    </>
  );
}
