export type InfoPageDefinition = {
  slug: string;
  name: string;
  description: string;
};

export const INFO_PAGES: InfoPageDefinition[] = [
  {
    slug: "empires",
    name: "Empires Through History",
    description: "Explore how empires' borders have changed across history.",
  },
];

export function getInfoPage(slug: string): InfoPageDefinition | undefined {
  return INFO_PAGES.find((p) => p.slug === slug);
}
