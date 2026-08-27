/*
 * WHY: `ActionDef.iconKey` has existed as `iconKey?: string` with the comment
 *      *"resolved by the consumer's icon set"* — and there is no consumer icon
 *      set. Nothing in either tree resolves it. It is set on **2 of 220**
 *      actions (0.9%) and **rendered by nothing**: `Button` is the only
 *      component that accepts an `ActionDef` and it reads `kind`, `label` and
 *      `ariaLabel` only.
 *
 *      Meanwhile 105 files import `lucide-react` directly, so there is no
 *      indirection anywhere — an icon is whatever each file happened to pick.
 *
 * WHAT: The name→component registry `iconKey` was always supposed to resolve
 *       against, so the field can become real rather than inert.
 *
 * ## Typed, so a bad key cannot ship
 *
 * `ActionDef.iconKey` is retyped from `string` to `IconKey`. A typo was
 * previously a silent no-op that rendered nothing; it is now a compile error.
 * That is the same reasoning as every other registry in this codebase
 * (`Record<Union, true>`), applied to icons.
 *
 * The one working name→icon pattern already in the repo is `TrustBadges.tsx`'s
 * local `BADGE_ICONS` + `TrustBadgeIconKey` union. This generalises that shape
 * rather than inventing a new one.
 *
 * ## Deliberately small
 *
 * Only the verbs the action registry actually uses, plus the handful of
 * resource glyphs row menus need. This is not a re-export of lucide — a
 * registry that mirrors the whole icon set is just an alias with extra steps,
 * and it would pull every icon into the bundle.
 *
 * EXPORTS: ICONS, type IconKey, isIconKey, resolveIcon
 *
 * @tag domain:ui
 * @tag layer:constants
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:Button,RowActionMenu,BulkActionBar,action-registry
 * @tag sideEffects:none
 */

import {
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  Copy,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileDown,
  Filter,
  Flag,
  Gavel,
  HelpCircle,
  Heart,
  Link as LinkIcon,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Reply,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Sun,
  Scale,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Semantic name → component.
 *
 * Keys are INTENT ("approve", "reject"), not appearance ("check", "x"), so a
 * later change of glyph is one edit here rather than a sweep of call sites.
 * The few appearance-named keys exist because the action they serve genuinely
 * has no better verb.
 */
export const ICONS = {
  // Core CRUD
  view: Eye,
  hide: EyeOff,
  edit: Edit,
  create: Plus,
  save: Save,
  delete: Trash2,
  archive: Archive,
  duplicate: Copy,
  // Decisions
  approve: CheckCircle,
  reject: XCircle,
  confirm: Check,
  cancel: X,
  pause: Pause,
  resume: Play,
  restore: RotateCcw,
  retry: RefreshCw,
  // Moderation / trust
  ban: Ban,
  report: Flag,
  verify: ShieldCheck,
  lock: Lock,
  // Commerce
  cart: ShoppingCart,
  order: Package,
  ship: Truck,
  bid: Gavel,
  wishlist: Heart,
  review: Star,
  analytics: TrendingUp,
  // Communication
  message: MessageSquare,
  reply: Reply,
  email: Mail,
  send: Send,
  share: Share2,
  link: LinkIcon,
  // Data movement
  download: Download,
  export: FileDown,
  upload: Upload,
  // Navigation / chrome
  back: ArrowLeft,
  search: Search,
  filter: Filter,
  settings: Settings,
  expand: ChevronDown,
  user: User,
  // Header chrome. Added 2026-08-27 when TitleBarLayout stopped hand-inlining
  // ten raw <svg> elements — a raw <svg> carries no `shrink-0`, so inside a
  // padded flex control it silently shrank rather than rendering at its stated
  // size, and no audit could see a size it never declared.
  notification: Bell,
  compare: Scale,
  help: HelpCircle,
  menu: Menu,
  close: X,
  themeLight: Sun,
  themeDark: Moon,
  deals: Tag,
} as const;

/** Every valid `iconKey`. A typo is a compile error, not a silent blank. */
export type IconKey = keyof typeof ICONS;

/**
 * The ONLY sanctioned glyph sizes.
 *
 * WHY: a sweep of `appkit/src` + `src` found ~217 icon sites each hand-picking
 * a size, in two spellings with no canonical order (`h-4 w-4` ×104,
 * `w-5 h-5` ×64, `h-3 w-3` ×23, `h-3.5 w-3.5` ×26) across 105 lucide-importing
 * files and 63 with an inline `<svg>`. Nothing related a glyph's size to the
 * control containing it, so a 14px heart could sit in a 44px button and read as
 * broken — which is exactly the "the wishlist icon is very small" report.
 *
 * Pick by ROLE, not by eye:
 *
 * | key  | px | use for                                             |
 * |------|----|-----------------------------------------------------|
 * | `xs` | 12 | dense meta, inside a badge or a caption row          |
 * | `sm` | 14 | chrome inside a `size="sm"` control                 |
 * | `md` | 16 | inline with body text; a `size="md"` control        |
 * | `lg` | 20 | a standalone icon-only control's glyph              |
 * | `xl` | 24 | hero, empty-state, feature tile                     |
 * | `2xl`| 28 | chrome floating on an overlay (lightbox, carousel)  |
 *
 * `2xl` exists because ten lightbox/carousel controls had independently and
 * unanimously picked 28px — that agreement is a real tier, not ten mistakes.
 * Overlay chrome sits over arbitrary imagery and needs more presence than
 * inline UI.
 *
 * `<Button>` and `<IconButton>` derive their own icon size from these — prefer
 * letting the control choose over passing a size by hand.
 */
export const ICON_SIZE = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-6 w-6",
  "2xl": "h-7 w-7",
} as const;

export type IconSizeKey = keyof typeof ICON_SIZE;

/** Narrow an unknown string — for data that crosses a boundary the type cannot. */
export function isIconKey(value: unknown): value is IconKey {
  return typeof value === "string" && value in ICONS;
}

/**
 * Resolve a key to its component, or `undefined`.
 *
 * Returns `undefined` rather than a placeholder glyph on purpose: a missing
 * icon should render nothing and leave the label intact, not draw a
 * question-mark box that reads as a broken image.
 */
export function resolveIcon(key: string | null | undefined): LucideIcon | undefined {
  return isIconKey(key) ? ICONS[key] : undefined;
}
