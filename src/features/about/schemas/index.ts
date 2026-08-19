export * from "./firestore";

import { z } from "zod";

const REQUIRED_TITLE = "Title is required";
const REQUIRED_TEXT = "Text is required";

export const aboutHowItemSchema = z.object({
  title: z.string().min(1, REQUIRED_TITLE),
  text: z.string().min(1, REQUIRED_TEXT),
  icon: z.string().min(1, "Icon is required"),
  tone: z.enum(["indigo", "teal", "amber", "rose"]).optional(),
});

export const aboutValueItemSchema = z.object({
  title: z.string().min(1, REQUIRED_TITLE),
  text: z.string().min(1, REQUIRED_TEXT),
  icon: z.string().min(1, "Icon is required"),
});

export const aboutMilestoneSchema = z.object({
  year: z.string().min(1, "Year is required"),
  text: z.string().min(1, REQUIRED_TEXT),
});

export const aboutTeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().min(1, "Bio is required"),
  photoUrl: z.string().optional(),
  isFounder: z.boolean().optional(),
  isDeveloper: z.boolean().optional(),
});

export const aboutContentSchema = z.object({
  title: z.string().min(1, REQUIRED_TITLE),
  subtitle: z.string().min(1, "Subtitle is required"),
  missionTitle: z.string().min(1, "Mission title is required"),
  missionText: z.string().min(1, "Mission text is required"),
  howItWorksTitle: z.string().min(1, "How it works title is required"),
  howItems: z.array(aboutHowItemSchema),
  valuesTitle: z.string().min(1, "Values title is required"),
  valueItems: z.array(aboutValueItemSchema),
  milestonesTitle: z.string().min(1, "Milestones title is required"),
  milestones: z.array(aboutMilestoneSchema),
  teamTitle: z.string().min(1, "Team title is required"),
  teamSubtitle: z.string().min(1, "Team subtitle is required"),
  teamMembers: z.array(aboutTeamMemberSchema),
  ctaTitle: z.string().min(1, "CTA title is required"),
  ctaSell: z.string().min(1, "Sell CTA copy is required"),
  ctaShop: z.string().min(1, "Shop CTA copy is required"),
});
