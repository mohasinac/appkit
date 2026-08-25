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
  Heart,
  Link as LinkIcon,
  Lock,
  Mail,
  MessageSquare,
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
} as const;

/** Every valid `iconKey`. A typo is a compile error, not a silent blank. */
export type IconKey = keyof typeof ICONS;

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
