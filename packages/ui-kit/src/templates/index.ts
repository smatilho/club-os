import type { PageBlock } from "@club-os/domain-core";

export interface PageTemplate {
  key: string;
  name: string;
  description: string;
  blocks: PageBlock[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: "home",
    name: "Home Page",
    description: "Hero banner with features, stats, and call-to-action",
    blocks: [
      { id: "tpl-hero", type: "hero", props: { heading: "Welcome to Our Club", subheading: "Where community meets excellence. Discover world-class facilities, expert programs, and a vibrant community dedicated to your wellbeing.", ctaText: "Become a Member", ctaLink: "/public/membership" } },
      { id: "tpl-stats", type: "stats", props: { items: JSON.stringify([{ value: "500+", label: "Active Members" }, { value: "10+", label: "Years Serving" }, { value: "50+", label: "Weekly Classes" }, { value: "98%", label: "Satisfaction" }]) } },
      { id: "tpl-features", type: "feature_list", props: { heading: "Why Members Choose Us", features: JSON.stringify([{ title: "World-Class Facilities", description: "Modern equipment, pristine pools, and beautifully maintained grounds designed for every level of athlete and enthusiast." }, { title: "Expert Programs", description: "Professional trainers and instructors deliver personalized programs that help you reach your goals faster." }, { title: "Vibrant Community", description: "Connect with like-minded members through social events, leagues, and classes that make fitness fun." }]) } },
      { id: "tpl-cta", type: "cta", props: { heading: "Ready to Experience the Difference?", description: "Schedule a tour and see firsthand why our members love being part of our community.", buttonText: "Schedule a Tour", buttonLink: "/public/contact" } },
    ],
  },
  {
    key: "about",
    name: "About Page",
    description: "Club story with two-column layout, stats, and CTA",
    blocks: [
      { id: "tpl-hero", type: "hero", props: { heading: "Our Story", subheading: "Built on a foundation of community, wellness, and excellence." } },
      { id: "tpl-text", type: "rich_text", props: { content: "Founded with a passion for community and wellness, our club has been a cornerstone of active living for over a decade. What started as a vision for a better kind of fitness experience has grown into a thriving community of members who share our commitment to healthy, connected lives.\n\nWe believe that a great club is more than facilities — it's the people, the culture, and the shared experiences that make it special. Every program, every space, and every event is designed with our members in mind." } },
      { id: "tpl-two-col", type: "two_column", props: { leftContent: "Our Mission\n\nTo provide an inclusive, world-class environment where members of all ages and abilities can pursue their health and wellness goals while building lasting friendships and community connections.", rightContent: "Our Values\n\nExcellence in everything we do. Inclusivity that welcomes everyone. Innovation that keeps us ahead. Community that brings us together. Integrity in every interaction." } },
      { id: "tpl-stats", type: "stats", props: { items: JSON.stringify([{ value: "500+", label: "Active Members" }, { value: "10+", label: "Years Serving" }, { value: "50+", label: "Weekly Classes" }, { value: "98%", label: "Satisfaction" }]) } },
      { id: "tpl-cta", type: "cta", props: { heading: "Come See Us in Person", description: "Experience our facilities and meet our team. We'd love to show you around.", buttonText: "Book a Tour", buttonLink: "/public/contact" } },
    ],
  },
  {
    key: "facilities",
    name: "Facilities Page",
    description: "Showcase club amenities with cards and feature highlights",
    blocks: [
      { id: "tpl-hero", type: "hero", props: { heading: "Our Facilities", subheading: "Everything you need under one roof. Modern, well-maintained, and designed for your comfort." } },
      { id: "tpl-cards", type: "card_grid", props: { heading: "Explore Our Spaces", cards: JSON.stringify([{ title: "Fitness Center", description: "State-of-the-art cardio and strength equipment with dedicated training zones for every fitness level." }, { title: "Pool & Spa", description: "Olympic-sized lap pool, heated therapeutic spa, and steam sauna for complete relaxation." }, { title: "Tennis & Racquet", description: "Indoor and outdoor courts with professional lighting, plus pickleball and squash facilities." }, { title: "Group Studios", description: "Purpose-built spaces for yoga, cycling, HIIT, and 40+ weekly group fitness classes." }, { title: "Social Lounge", description: "Comfortable gathering space with dining, refreshments, and panoramic views of the grounds." }, { title: "Pro Shop", description: "Curated selection of equipment, apparel, and accessories from top athletic brands." }]) } },
      { id: "tpl-features", type: "feature_list", props: { heading: "The Details Matter", features: JSON.stringify([{ title: "Always Clean", description: "Professional cleaning staff maintains our facilities to the highest standards throughout the day." }, { title: "Modern Equipment", description: "We regularly update and replace equipment to ensure you always have access to the latest technology." }, { title: "Accessible Design", description: "All facilities are designed to be welcoming and accessible to members of every ability." }]) } },
      { id: "tpl-cta", type: "cta", props: { heading: "See It for Yourself", description: "Photos don't do it justice. Schedule a personal tour and experience our facilities firsthand.", buttonText: "Schedule a Tour", buttonLink: "/public/contact" } },
    ],
  },
  {
    key: "membership-faq",
    name: "Membership & FAQ",
    description: "Membership information with plans overview and FAQ",
    blocks: [
      { id: "tpl-hero", type: "hero", props: { heading: "Membership", subheading: "Find the perfect plan for your lifestyle. All memberships include full access to facilities, classes, and member events." } },
      { id: "tpl-cards", type: "card_grid", props: { heading: "Membership Options", cards: JSON.stringify([{ title: "Individual", description: "Full access for one adult. Perfect for dedicated fitness enthusiasts who want the complete club experience." }, { title: "Couple", description: "Full access for two adults at the same address. Train together and save with our most popular plan." }, { title: "Family", description: "Full access for two adults and dependents under 21. The best value for active families." }]) } },
      { id: "tpl-features", type: "feature_list", props: { heading: "Every Membership Includes", features: JSON.stringify([{ title: "Full Facility Access", description: "Unlimited use of fitness center, pool, courts, and all club amenities during operating hours." }, { title: "Group Classes", description: "Join any of our 50+ weekly group fitness classes at no additional cost." }, { title: "Member Events", description: "Exclusive access to social events, tournaments, clinics, and community gatherings." }]) } },
      { id: "tpl-faq", type: "faq", props: { heading: "Frequently Asked Questions", items: JSON.stringify([{ question: "What are your operating hours?", answer: "We're open Monday through Friday from 5am to 10pm, and Saturday through Sunday from 7am to 8pm. Holiday hours may vary and are posted in advance." }, { question: "Is there a joining fee?", answer: "We periodically offer promotions that waive or reduce the joining fee. Contact our membership team for current offers and availability." }, { question: "Can I freeze my membership?", answer: "Yes. Members may freeze their membership for up to 3 months per calendar year. Freezes can be requested through your member portal or at the front desk." }, { question: "Do you offer guest passes?", answer: "Every member receives 2 complimentary guest passes per month. Additional guest passes are available for purchase." }, { question: "What's your cancellation policy?", answer: "We require 30 days written notice for cancellation. You'll continue to have full access through the end of your notice period." }]) } },
      { id: "tpl-cta", type: "cta", props: { heading: "Ready to Join?", description: "Start your membership today or schedule a tour to learn more about what we offer.", buttonText: "Get Started", buttonLink: "/public/contact" } },
    ],
  },
  {
    key: "contact",
    name: "Contact Page",
    description: "Contact information with hours and tour scheduling",
    blocks: [
      { id: "tpl-heading", type: "section_heading", props: { heading: "Contact Us", subheading: "We'd love to hear from you. Reach out by phone, email, or stop by for a visit." } },
      { id: "tpl-two-col", type: "two_column", props: { leftContent: "Visit Us\n\n123 Club Street\nYour City, ST 12345\n\nPhone: (555) 123-4567\nEmail: info@example.com\n\nFront desk staff are available during all operating hours to assist you.", rightContent: "Operating Hours\n\nMonday — Friday: 5:00am — 10:00pm\nSaturday: 7:00am — 8:00pm\nSunday: 7:00am — 8:00pm\n\nHoliday hours are posted at the front desk and on our member portal in advance." } },
      { id: "tpl-callout", type: "callout", props: { variant: "info", title: "Schedule a Tour", content: "Interested in becoming a member? Book a complimentary tour and we'll show you everything our club has to offer. Tours are available daily — just call or email to reserve your time." } },
      { id: "tpl-cta", type: "cta", props: { heading: "Join Our Community", description: "Take the first step toward a healthier, more connected lifestyle.", buttonText: "Learn About Membership", buttonLink: "/public/membership" } },
    ],
  },
  {
    key: "generic",
    name: "Blank Page",
    description: "Start with a heading and content block",
    blocks: [
      { id: "tpl-heading", type: "section_heading", props: { heading: "Page Title", subheading: "" } },
      { id: "tpl-text", type: "rich_text", props: { content: "Start writing your content here." } },
    ],
  },
];

export function getTemplate(key: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.key === key);
}
