/**
 * About Us page content — stored at `siteSettings.aboutContent`
 * (singleton doc, not its own collection). Replaces the previous untyped
 * `Record<string, string>` shape that only covered 5 loose fields.
 */

export interface AboutHowItem {
  title: string;
  text: string;
  icon: string;
  tone?: "indigo" | "teal" | "amber" | "rose";
}

export interface AboutValueItem {
  title: string;
  text: string;
  icon: string;
  /** Optional second paragraph — how the value is actually enforced, not just stated. */
  detail?: string;
}

export interface AboutMilestone {
  year: string;
  text: string;
}

export interface AboutTeamMember {
  name: string;
  role: string;
  bio: string;
  /** `/media/<slug>` proxy URL — never a raw Storage URL. */
  photoUrl?: string;
  isFounder?: boolean;
  isDeveloper?: boolean;
  githubUrl?: string;
}

export interface AboutContentDocument {
  title: string;
  subtitle: string;
  missionTitle: string;
  missionText: string;
  howItWorksTitle: string;
  howItems: AboutHowItem[];
  valuesTitle: string;
  valuesSubtitle?: string;
  valueItems: AboutValueItem[];
  milestonesTitle: string;
  milestones: AboutMilestone[];
  teamTitle: string;
  teamSubtitle: string;
  teamMembers: AboutTeamMember[];
  ctaTitle: string;
  ctaSell: string;
  ctaShop: string;
}
