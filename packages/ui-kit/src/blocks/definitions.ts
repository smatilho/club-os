import { registerBlock } from "./registry";

registerBlock({
  type: "hero",
  displayName: "Hero Banner",
  schema: { heading: "string", subheading: "string", ctaText: "string", ctaLink: "string", backgroundImage: "string" },
  defaultProps: { heading: "Welcome", subheading: "", ctaText: "", ctaLink: "", backgroundImage: "" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "text" },
    { key: "ctaText", label: "CTA Button Text", type: "text" },
    { key: "ctaLink", label: "CTA Link", type: "text" },
    { key: "backgroundImage", label: "Background Image URL", type: "text" },
  ],
});

registerBlock({
  type: "rich_text",
  displayName: "Rich Text",
  schema: { content: "string" },
  defaultProps: { content: "" },
  editorFields: [
    { key: "content", label: "Content", type: "textarea" },
  ],
});

registerBlock({
  type: "callout",
  displayName: "Callout",
  schema: { variant: "string", title: "string", content: "string" },
  defaultProps: { variant: "info", title: "", content: "" },
  editorFields: [
    { key: "variant", label: "Variant", type: "select", options: [
      { label: "Info", value: "info" },
      { label: "Success", value: "success" },
      { label: "Warning", value: "warning" },
      { label: "Error", value: "error" },
    ] },
    { key: "title", label: "Title", type: "text" },
    { key: "content", label: "Content", type: "textarea" },
  ],
});

registerBlock({
  type: "cta",
  displayName: "Call to Action",
  schema: { heading: "string", description: "string", buttonText: "string", buttonLink: "string" },
  defaultProps: { heading: "", description: "", buttonText: "Learn More", buttonLink: "" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "buttonText", label: "Button Text", type: "text" },
    { key: "buttonLink", label: "Button Link", type: "text" },
  ],
});

registerBlock({
  type: "card_grid",
  displayName: "Card Grid",
  schema: { heading: "string", cards: "string" },
  defaultProps: { heading: "", cards: "[]" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "cards", label: "Cards (JSON array)", type: "textarea" },
  ],
});

registerBlock({
  type: "feature_list",
  displayName: "Feature List",
  schema: { heading: "string", features: "string" },
  defaultProps: { heading: "", features: "[]" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "features", label: "Features (JSON array)", type: "textarea" },
  ],
});

registerBlock({
  type: "two_column",
  displayName: "Two Column",
  schema: { leftContent: "string", rightContent: "string" },
  defaultProps: { leftContent: "", rightContent: "" },
  editorFields: [
    { key: "leftContent", label: "Left Column", type: "textarea" },
    { key: "rightContent", label: "Right Column", type: "textarea" },
  ],
});

registerBlock({
  type: "image",
  displayName: "Image",
  schema: { src: "string", alt: "string", caption: "string" },
  defaultProps: { src: "", alt: "", caption: "" },
  editorFields: [
    { key: "src", label: "Image URL", type: "text" },
    { key: "alt", label: "Alt Text", type: "text" },
    { key: "caption", label: "Caption", type: "text" },
  ],
});

registerBlock({
  type: "faq",
  displayName: "FAQ",
  schema: { heading: "string", items: "string" },
  defaultProps: { heading: "Frequently Asked Questions", items: "[]" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "items", label: "FAQ Items (JSON array)", type: "textarea" },
  ],
});

registerBlock({
  type: "stats",
  displayName: "Stats",
  schema: { items: "string" },
  defaultProps: { items: "[]" },
  editorFields: [
    { key: "items", label: "Stats (JSON array: [{value, label}])", type: "textarea" },
  ],
});

registerBlock({
  type: "section_heading",
  displayName: "Section Heading",
  schema: { heading: "string", subheading: "string" },
  defaultProps: { heading: "", subheading: "" },
  editorFields: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "text" },
  ],
});

registerBlock({
  type: "divider",
  displayName: "Divider",
  schema: { style: "string" },
  defaultProps: { style: "solid" },
  editorFields: [
    { key: "style", label: "Style", type: "select", options: [
      { label: "Solid", value: "solid" },
      { label: "Dashed", value: "dashed" },
      { label: "Dotted", value: "dotted" },
    ] },
  ],
});
