/**
 * Scam Type Definitions
 *
 * 27 documented scam patterns across 6 categories, specific to India's
 * collectibles aftermarket (Pokémon TCG, Hot Wheels, Beyblades, action figures,
 * graded cards, vintage toys).
 *
 * Each entry includes: howItHappens (what the scammer does) and
 * howToAvoid[] (actionable advice). Used on public scam-type pages,
 * registration acknowledgement modal, and structured SEO data.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ScamCategory =
  | "price_manipulation"
  | "social_engineering"
  | "payment_fraud"
  | "preorder_delivery_fraud"
  | "identity_impersonation"
  | "item_authenticity_fraud"
  | "logistics_fraud";

export type ScamType =
  // Price Manipulation
  | "undervaluation"
  | "fake_price_reference"
  | "bait_and_switch"
  | "condition_misrepresentation"
  // Social Engineering
  | "sympathy_play"
  | "trust_building_fraud"
  | "urgency_pressure"
  | "student_impersonation"
  // Payment Fraud
  | "advance_payment_ghost"
  | "fake_payment_screenshot"
  | "partial_payment_ghost"
  | "chargeback_fraud"
  | "overpayment_scam"
  // Pre-order & Delivery Fraud
  | "preorder_hold"
  | "fake_preorder_listing"
  | "endless_delay_scam"
  // Identity & Impersonation
  | "seller_impersonation"
  | "platform_impersonation"
  | "account_takeover_resale"
  | "fake_escrow"
  // Item Authenticity Fraud
  | "counterfeit_item"
  | "fake_grading_claim"
  | "graded_case_tampering"
  | "sealed_product_repack"
  // Logistics Fraud
  | "empty_box_ship"
  | "fake_tracking_number"
  | "return_swap_fraud";

export interface ScamTypeDefinition {
  id: ScamType;
  category: ScamCategory;
  label: string;
  shortDescription: string;
  howItHappens: string;
  howToAvoid: string[];
}

export interface ScamCategoryDefinition {
  id: ScamCategory;
  label: string;
  description: string;
  icon: string;
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const SCAM_CATEGORIES: ScamCategoryDefinition[] = [
  {
    id: "price_manipulation",
    label: "Price Manipulation",
    description:
      "Scammer tricks you into selling too cheap or buying at an inflated price by misrepresenting value, condition, or market rates.",
    icon: "IndianRupee",
  },
  {
    id: "social_engineering",
    label: "Social Engineering",
    description:
      "Scammer exploits your emotions — sympathy, trust, or urgency — to bypass your better judgement and agree to unfair terms.",
    icon: "UserX",
  },
  {
    id: "payment_fraud",
    label: "Payment Fraud",
    description:
      "Scammer manipulates the payment process so you lose money: fake screenshots, advance payment with no delivery, chargebacks after receipt.",
    icon: "CreditCard",
  },
  {
    id: "preorder_delivery_fraud",
    label: "Pre-order & Delivery Fraud",
    description:
      "Scammer collects advance money for future items they never intend to deliver, hiding behind vague 'delays' until pressure forces a refund.",
    icon: "Package",
  },
  {
    id: "identity_impersonation",
    label: "Identity & Impersonation",
    description:
      "Scammer pretends to be a reputable seller, LetItRip support, or a trusted community member to steal your money or credentials.",
    icon: "UserCheck",
  },
  {
    id: "item_authenticity_fraud",
    label: "Item Authenticity Fraud",
    description:
      "Scammer sells counterfeit, tampered, or misrepresented collectibles — fake Pokémon cards, cracked PSA slabs, repacked booster boxes.",
    icon: "ShieldAlert",
  },
  {
    id: "logistics_fraud",
    label: "Logistics & Shipping Fraud",
    description:
      "Scammer manipulates the shipment process — empty boxes, fake tracking, or return swaps — to claim delivery without handing over the real item.",
    icon: "Truck",
  },
];

// ============================================================================
// SCAM TYPE DEFINITIONS
// ============================================================================

export const SCAM_TYPES: ScamTypeDefinition[] = [
  // ── Price Manipulation ──────────────────────────────────────────────────────

  {
    id: "undervaluation",
    category: "price_manipulation",
    label: "Undervaluation (Lowball Trick)",
    shortDescription:
      "Scammer convinces seller the item is worth far less than market value to buy cheap and resell at profit.",
    howItHappens:
      "A buyer approaches — often someone who appears knowledgeable — and insists your item is common, damaged, or worth only a fraction of the real price. They may say 'I saw this for ₹300 online' or 'this series is not popular anymore'. Once you sell at a deep discount, they immediately resell at true market value. This is especially common with vintage items whose original owners don't actively follow current pricing.",
    howToAvoid: [
      "Check current sold listings on LetItRip, eBay, and local Facebook groups before agreeing to any price.",
      "Never accept a buyer's stated 'market price' at face value — do your own 5-minute research first.",
      "If someone seems unusually eager to buy at a specific low price, that is a red flag.",
      "PSA-graded and sealed vintage items especially hold hidden value — get independent opinions.",
      "The more knowledge a buyer shows about your item's rarity, the more likely they know it is worth more than they claim.",
    ],
  },

  {
    id: "fake_price_reference",
    category: "price_manipulation",
    label: "Fake Price Reference",
    shortDescription:
      "Scammer shows fabricated or cherry-picked price screenshots to justify an absurdly low offer.",
    howItHappens:
      "The buyer pastes a link or screenshot showing 'identical' item sold for much less on another platform. The reference is either photoshopped, from a completely different edition/condition, or an outlier damaged sale. Seller, not wanting to appear greedy, accepts the distorted pricing.",
    howToAvoid: [
      "Cross-reference any price screenshot yourself — open the actual platform and search.",
      "Verify: same edition, same condition (sealed vs. opened vs. graded), same region.",
      "A single outlier sale does not set market value — look at the median of 5–10 recent sales.",
      "Reputable buyers do not need to justify an offer with screenshots — they simply make a fair offer.",
    ],
  },

  {
    id: "bait_and_switch",
    category: "price_manipulation",
    label: "Bait and Switch",
    shortDescription:
      "Item listed at attractive price; after buyer is engaged, the terms or item change.",
    howItHappens:
      "Listing shows a low price or a desirable item. Once the buyer expresses serious interest or pays, the seller claims 'that item just sold' and offers a substitute at higher price, or the item delivered is a different (cheaper) variant than advertised.",
    howToAvoid: [
      "Confirm all item specifics (set number, condition, edition) in writing before payment.",
      "Request detailed photos of the actual item being sold — not stock images.",
      "Use LetItRip's on-platform messaging so all communications are recorded.",
      "Report listings that change their item description after you express interest.",
    ],
  },

  {
    id: "condition_misrepresentation",
    category: "price_manipulation",
    label: "Condition Misrepresentation",
    shortDescription:
      "Item listed as mint/sealed/graded; delivered item is damaged, opened, or counterfeit.",
    howItHappens:
      "Listing uses words like 'mint', 'PSA 10', 'factory sealed', or 'first edition' but the actual item has visible damage, has been opened, or is a reprint. Photos are taken from flattering angles or are stock images, not of the actual item.",
    howToAvoid: [
      "Always ask for photos from multiple angles, including the corners, back, and any seal/hologram.",
      "Ask for proof of grading: PSA/BGS certificate number you can verify on their website.",
      "For sealed products, ask for a photo of the original shrink wrap and any LetItRip hologram sticker.",
      "Video unboxing on delivery is your strongest evidence for dispute claims.",
    ],
  },

  // ── Social Engineering ───────────────────────────────────────────────────────

  {
    id: "sympathy_play",
    category: "social_engineering",
    label: "Sympathy Play",
    shortDescription:
      "Scammer exploits your empathy to get a deep discount or deferred payment you would not normally give.",
    howItHappens:
      "Buyer presents a convincing sad story: a sick parent, a lost job, a dead collection that must be rebuilt cheaply. They appeal to your sense of community — 'we collectors should help each other'. Once sympathy is established, they ask for a huge discount, free shipping, or pay-later agreement. After getting the item, they either ghost or resell it immediately.",
    howToAvoid: [
      "Charity and commerce are separate — it is perfectly reasonable to maintain your price regardless of someone's circumstances.",
      "Pay-later agreements have near-zero enforceability for individuals — never ship before receiving full payment.",
      "A story that seems designed to trigger pity should be treated as a warning sign.",
      "If you want to help a genuine collector, consider donating to a community fund, not discounting at a personal loss.",
    ],
  },

  {
    id: "trust_building_fraud",
    category: "social_engineering",
    label: "Trust Building Fraud",
    shortDescription:
      "Scammer builds long-term rapport through small legitimate transactions, then executes one large fraud.",
    howItHappens:
      "The scammer interacts with you over weeks or months — small helpful messages, a few low-value successful trades, positive reviews on each other's listings. Once significant trust is built, they propose a large transaction: a rare card, a valuable lot, or an advance payment. After receiving money or item, they disappear.",
    howToAvoid: [
      "Scale of trust should match the scale of risk — a history of ₹500 trades does not justify a ₹50,000 advance.",
      "Use escrow or COD for high-value first-time large transactions even with known contacts.",
      "Do not let existing rapport override basic verification steps.",
      "Report immediately if a long-known contact suddenly ghosts after a large transaction.",
    ],
  },

  {
    id: "urgency_pressure",
    category: "social_engineering",
    label: "Urgency Pressure",
    shortDescription:
      "Scammer creates artificial time pressure to force a hasty decision without proper verification.",
    howItHappens:
      "'I'm leaving the city in 2 hours', 'courier picks up in 30 minutes', 'another buyer is waiting — decide now'. The deadline is fabricated. Its purpose is to prevent you from researching the item's value, verifying payment, or consulting others. Rushed decisions skip safeguards.",
    howToAvoid: [
      "Legitimate buyers accept reasonable time for verification — anyone refusing basic checks is a red flag.",
      "No deal is so time-sensitive it cannot wait for you to verify payment has actually cleared.",
      "If someone creates excessive pressure, decline and offer to transact when you are comfortable.",
      "Urgency that benefits only the scammer's timeline, not yours, is manufactured.",
    ],
  },

  {
    id: "student_impersonation",
    category: "social_engineering",
    label: "Student/Kid Impersonation",
    shortDescription:
      "Scammer pretends to be a student or child with limited means to guilt-trip seller into a giveaway-price deal.",
    howItHappens:
      "Profile photos show a young face or a school uniform. Messages are written in broken language to appear young and naive. Story: 'I'm 15 and I've always wanted this card, I've been saving up'. Seller, moved by nostalgia or generosity, sells at cost or gives deferred payment. The 'student' resells for profit.",
    howToAvoid: [
      "Age and circumstances do not obligate you to sell below market rate.",
      "Verified payments only — never ship on a promise from an unverified stranger.",
      "Collector communities have proper channels for discounted items (giveaways, community sales) — do not conduct them through private deals with strangers.",
    ],
  },

  // ── Payment Fraud ────────────────────────────────────────────────────────────

  {
    id: "advance_payment_ghost",
    category: "payment_fraud",
    label: "Advance Payment Ghost",
    shortDescription:
      "Seller takes advance payment, ships nothing, and ghosts the buyer.",
    howItHappens:
      "Buyer sends money upfront via UPI, bank transfer, or wallet before receiving the item. Seller then stops responding: messages go unread, calls unanswered, account disappears or blocks the buyer. The money is gone and there is no enforceable recourse without platform protection.",
    howToAvoid: [
      "Never send full advance payment to an unverified individual seller outside a trusted platform.",
      "Use LetItRip's order flow — payment is held by the platform until delivery is confirmed.",
      "For off-platform trades, insist on COD (cash on delivery) or use a mutually trusted physical middleman.",
      "Partial advance (≤20%) for legitimate preorders is more reasonable — never 100% upfront to an unknown.",
      "If a seller insists on full advance before sharing shipping details, do not proceed.",
    ],
  },

  {
    id: "fake_payment_screenshot",
    category: "payment_fraud",
    label: "Fake Payment Screenshot",
    shortDescription:
      "Scammer sends a photoshopped UPI/PayTM success screenshot to claim payment was made.",
    howItHappens:
      "After agreeing on a deal, the scammer sends what looks like a successful UPI or PayTM payment screenshot. The screenshot is edited — the amount, recipient name, and transaction ID are fabricated. Seller ships the item trusting the screenshot, but payment never arrives in their account.",
    howToAvoid: [
      "Never ship based on a screenshot — check your bank or UPI app for the actual credit.",
      "Wait for the payment to appear in your account balance, not just as a notification that can be faked.",
      "UPI transactions show within seconds — insist on seeing real-time confirmation.",
      "Ask the sender to share the UTR (Unique Transaction Reference) number and verify it on your bank portal.",
    ],
  },

  {
    id: "partial_payment_ghost",
    category: "payment_fraud",
    label: "Partial Payment Ghost",
    shortDescription:
      "Scammer pays a small earnest deposit, takes delivery, then ghosts for the remaining balance.",
    howItHappens:
      "Buyer proposes paying a small portion now ('to show intent') and the rest on delivery or within a few days. After receiving the item, they stop responding to requests for the balance. The partial payment was enough to seem legitimate but not enough to cover loss.",
    howToAvoid: [
      "Do not agree to partial payment schemes with strangers — full payment before dispatch only.",
      "An earnest deposit has no legal enforceability in casual individual trades.",
      "Legitimate buyers who cannot pay immediately will wait until they can — not collect now and pay 'later'.",
    ],
  },

  {
    id: "chargeback_fraud",
    category: "payment_fraud",
    label: "Chargeback Fraud",
    shortDescription:
      "Buyer pays via credit card or Razorpay, receives the item, then disputes the payment with their bank.",
    howItHappens:
      "Buyer pays through a credit card gateway. After receiving the item, they file a chargeback with their bank claiming 'unauthorized transaction' or 'item not received'. The bank reverses the payment. Seller loses both the item and the money. This is common for high-value collectibles.",
    howToAvoid: [
      "Photograph and video the item before packing, and the packed parcel with tracking label visible.",
      "Use tracked shipping with proof of delivery signatures for high-value orders.",
      "Collect buyer's full address, phone, and LetItRip account before shipping.",
      "On LetItRip's platform, all transactions are logged — dispute resolution can use platform records.",
      "Be cautious of buyers who insist on credit card payment specifically for peer-to-peer deals.",
    ],
  },

  {
    id: "overpayment_scam",
    category: "payment_fraud",
    label: "Overpayment Scam",
    shortDescription:
      "Scammer 'accidentally' overpays, asks for a refund of the excess — their original payment then bounces.",
    howItHappens:
      "Scammer sends ₹5,000 for a ₹500 item. They apologise for the 'mistake' and urgently ask you to refund ₹4,500. You refund from your own pocket. Their original ₹5,000 payment was via a bouncing cheque, cancelled transaction, or reversible payment method — so it never actually settles. You lose ₹4,500.",
    howToAvoid: [
      "Wait for any payment to fully clear (not just appear as pending) before acting on it.",
      "Legitimate buyers do not overpay by large amounts — this is always a setup.",
      "Do not refund any 'excess' until the original payment is fully irreversible and settled.",
      "Prefer UPI instant transfers where settlement is real-time — avoid cheques or partial payment methods.",
    ],
  },

  // ── Pre-order & Delivery Fraud ──────────────────────────────────────────────

  {
    id: "preorder_hold",
    category: "preorder_delivery_fraud",
    label: "Pre-order Float Scam",
    shortDescription:
      "Seller collects deposits from many buyers for months, uses the float, then refunds after public pressure — never having had a supplier.",
    howItHappens:
      "Seller announces preorders for a popular item: limited Pokémon ETB, exclusive Funko Pop, or imported toy. Hundreds of buyers pay 50–100% deposits. The seller strings everyone along with monthly 'shipping delay' updates. When complaints go public on Twitter/WhatsApp, they quietly refund everyone without delivering. They profited from interest on the collected deposits with no real business risk.",
    howToAvoid: [
      "Only preorder from sellers with a documented history of successful preorder delivery.",
      "Ask for proof of supplier relationship: purchase order, supplier invoice, or import record.",
      "Be suspicious of preorders with no clear shipping date or supplier name.",
      "A seller who cannot provide any evidence of an actual supplier order likely doesn't have one.",
      "LetItRip preorders require store verification — prefer platform transactions over off-platform deals.",
    ],
  },

  {
    id: "fake_preorder_listing",
    category: "preorder_delivery_fraud",
    label: "Fake Pre-order Listing",
    shortDescription:
      "Seller lists high-demand limited items for preorder with zero supplier relationship, collects deposits, disappears.",
    howItHappens:
      "Scammer identifies a sold-out or unreleased product generating demand (e.g., a new Pokémon TCG set, limited Gundam model). They create a listing offering preorders at slightly below expected retail. After collecting enough deposits, the account disappears or is suspended.",
    howToAvoid: [
      "Verify that the seller has previously delivered similar preorders — check their store history.",
      "For brand-new unreleased items, prefer official distributors or LetItRip-verified stores.",
      "If the deal is significantly below expected retail for a sold-out item, it is very likely fraudulent.",
    ],
  },

  {
    id: "endless_delay_scam",
    category: "preorder_delivery_fraud",
    label: "Endless Delay Scam",
    shortDescription:
      "Seller provides periodic vague updates to keep buyers waiting past dispute/refund windows without ever shipping.",
    howItHappens:
      "After taking payment, seller provides just enough communication ('customs delay', 'supplier issue', 'shipping next week') to keep buyers from escalating. Updates come strategically — just before people get angry. By the time the refund window closes, buyers have no recourse. Eventually the seller goes silent.",
    howToAvoid: [
      "Set a personal deadline when placing any order with advance payment — if not shipped by date X, dispute immediately.",
      "Vague updates without tracking numbers or evidence of actual shipment are a warning sign.",
      "File a payment dispute with your UPI bank before the dispute window closes, even if the seller is still communicating.",
      "On LetItRip, orders past their expected date can be escalated to admin — do not wait.",
    ],
  },

  // ── Identity & Impersonation ─────────────────────────────────────────────────

  {
    id: "seller_impersonation",
    category: "identity_impersonation",
    label: "Seller Impersonation",
    shortDescription:
      "Scammer steals product photos from a reputable seller's listings and creates identical listings to collect payment for nothing.",
    howItHappens:
      "Scammer finds a legitimate seller's high-quality listing photos (from LetItRip, OLX, Instagram, or YouTube). They create a near-identical listing — same photos, similar description, slightly lower price. Buyers who search the seller's name or item find the fake listing first. After payment, nothing is shipped.",
    howToAvoid: [
      "Verify the seller profile carefully — check their store on LetItRip, their review history, and how long they've been active.",
      "Do a reverse image search on any listing photos to see if they appear elsewhere.",
      "If a price is significantly lower than the original seller's known price, it may be an impersonation.",
      "Transact only through LetItRip's order flow — off-platform payments have no protection.",
    ],
  },

  {
    id: "platform_impersonation",
    category: "identity_impersonation",
    label: "Platform Impersonation (Fake Support)",
    shortDescription:
      "Scammer pretends to be LetItRip support via WhatsApp/DM and requests OTP, bank details, or login credentials.",
    howItHappens:
      "You receive a message from 'LetItRip Support' on WhatsApp, Telegram, or Instagram DMs. The message claims there's a 'KYC issue', 'payment hold', or 'account verification'. They ask for your OTP, password, bank account number, or ask you to send a 'refund' to their UPI to receive a 'blocked payout'.",
    howToAvoid: [
      "LetItRip support will NEVER ask for your password, OTP, or bank account details via WhatsApp.",
      "Official LetItRip communication comes only from @letitrip.in email addresses.",
      "If you receive a suspicious support message, verify by logging into your account and checking the official support section.",
      "Never send money to 'unblock' a payout — this is always a scam.",
    ],
  },

  {
    id: "account_takeover_resale",
    category: "identity_impersonation",
    label: "Account Takeover Resale",
    shortDescription:
      "Scammer hacks or takes over a dormant legitimate seller account and exploits its review history for fraudulent sales.",
    howItHappens:
      "A legitimate seller account with good ratings either gets phished or abandoned. Scammer gains access, changes the contact details, and starts listing high-demand items at attractive prices. Buyers trust the review history, pay, and receive nothing. By the time the abuse is reported, the scammer has collected multiple payments.",
    howToAvoid: [
      "Check when the account last had activity — sudden listing activity after months of inactivity is suspicious.",
      "Review dates matter: old positive reviews do not guarantee current legitimacy.",
      "Message the seller with a specific question about the item — a genuine seller can answer; an account hijacker often cannot.",
      "For high-value purchases, video call or request a live photo of the item with your name written on paper.",
    ],
  },

  {
    id: "fake_escrow",
    category: "identity_impersonation",
    label: "Fake Escrow / Middleman",
    shortDescription:
      "Scammer creates a fake third-party escrow or middleman service that is themselves or an accomplice.",
    howItHappens:
      "Scammer proposes using an 'escrow service' or 'trusted community middleman' to reassure the other party. The escrow account, website, or WhatsApp contact is created or controlled by the scammer. Both buyer and seller are told to send money or item to the 'neutral' party — who then disappears.",
    howToAvoid: [
      "Use only LetItRip's platform for escrow protection — never third-party escrow services you haven't independently verified.",
      "A genuine middleman will not be introduced by one party in the transaction.",
      "Verify any escrow service independently before using it — search their name online, look for reviews.",
    ],
  },

  // ── Item Authenticity Fraud ──────────────────────────────────────────────────

  {
    id: "counterfeit_item",
    category: "item_authenticity_fraud",
    label: "Counterfeit / Bootleg Item",
    shortDescription:
      "Seller sells a replica, bootleg, or factory-second as the genuine authentic article.",
    howItHappens:
      "Fake Pokémon cards printed with incorrect fonts, textures, or holofoil patterns. Replica Hot Wheels in reproduction original packaging. Funko Pops with wrong paint detail or box quality. Fake Beyblades with lightweight plastic. Products shipped from China with no authentic packaging. These often look convincing to non-experts.",
    howToAvoid: [
      "Know your item: learn what authentic versions look and feel like before buying.",
      "Check card texture, font, and holographic pattern for Pokémon TCG.",
      "For Hot Wheels, verify the base casting date stamp and paint finish.",
      "For Funko Pops, check the box serial number and window tray quality.",
      "Buy sealed products from stores with verified supplier relationships.",
      "If the price is too good for a scarce item, it almost certainly is not authentic.",
    ],
  },

  {
    id: "fake_grading_claim",
    category: "item_authenticity_fraud",
    label: "Fake Grading Claim",
    shortDescription:
      "Seller claims item is PSA/BGS authenticated when it is not, or shows a photoshopped certificate.",
    howItHappens:
      "Listing claims 'PSA 9', 'BGS 9.5', or 'CGC certified'. Seller may show a certificate image that is edited (wrong cert number, wrong card name). Or the item arrives without any slab at all. Some sellers claim 'raw grade equivalent to PSA 9' — which is meaningless.",
    howToAvoid: [
      "Verify PSA certification on psacard.com using the cert number on the slab.",
      "Verify BGS on beckett.com, CGC on cgccards.com.",
      "Never accept verbal grade claims — only physically slabbed cards with verifiable cert numbers count.",
      "'Raw PSA equivalent' is not a real grade — dismiss all such claims.",
    ],
  },

  {
    id: "graded_case_tampering",
    category: "item_authenticity_fraud",
    label: "Graded Case Tampering",
    shortDescription:
      "Scammer cracks open a legitimate PSA/BGS slab, swaps in a fake or lower-grade card, and reseals it.",
    howItHappens:
      "A real PSA 10 Charizard slab is purchased cheaply (perhaps a lower-grade). The case is carefully cut open, a fake or lower-grade card inserted, and the slab re-sealed with heat or glue. From a photo, it looks authentic. Even the cert number verifies — but it was for a different (original) card.",
    howToAvoid: [
      "Inspect the slab seam carefully — any unevenness, glue residue, or discolouration is a red flag.",
      "Cross-reference the cert number: verify on PSA's website that the card described matches what is in the slab.",
      "For high-value slabs (₹10,000+), buy only from dealers who will video-authenticate in real time.",
      "A cracked slab will often have slight flex or movement that an original sealed case does not.",
    ],
  },

  {
    id: "sealed_product_repack",
    category: "item_authenticity_fraud",
    label: "Sealed Product Repack",
    shortDescription:
      "Seller opens booster boxes/packs, removes valuable pulls, reseals with heat/glue, and resells as factory sealed.",
    howItHappens:
      "A Pokémon ETB or booster box is opened, the best cards (Charizard ex, special illustration rares) pulled out, and replaced with commons/uncommons. The box is resealed with a heat gun or glue, and the shrink wrap restored. It looks factory sealed but the valuable cards are gone.",
    howToAvoid: [
      "Examine seal edges for bubbles, uneven heat sealing, or any residue where glue was applied.",
      "Weigh the box if possible — repacked boxes often differ slightly due to missing cards.",
      "Buy sealed products only from stores with documented import invoices or from official distributor chains.",
      "A price significantly below retail for 'sealed' product on a popular set is a major warning sign.",
    ],
  },

  // ── Logistics Fraud ──────────────────────────────────────────────────────────

  {
    id: "empty_box_ship",
    category: "logistics_fraud",
    label: "Empty Box Shipment",
    shortDescription:
      "Seller ships an empty box or box filled with rocks/newspaper, then claims the item was packed.",
    howItHappens:
      "Seller generates a real tracking number and ships a package. The package contains newspaper, rocks, or nothing at all. When buyer disputes, seller points to shipping proof and claims 'item was packed — must have been removed in transit'. Carrier dispute is difficult without video evidence.",
    howToAvoid: [
      "Video record the unboxing of every high-value delivery — this is your evidence.",
      "If box feels too light or sounds different from expected, photograph the sealed box before opening.",
      "Report disputed deliveries immediately — do not wait days to dispute empty box claims.",
      "Insure high-value shipments and require signature on delivery.",
    ],
  },

  {
    id: "fake_tracking_number",
    category: "logistics_fraud",
    label: "Fake Tracking Number",
    shortDescription:
      "Seller provides a real-looking tracking number that was created but the package was never handed to the courier.",
    howItHappens:
      "Seller generates a shipping label (creating a tracking number) but never drops the parcel at the courier. The tracking shows 'label created' indefinitely. Seller claims 'courier hasn't scanned it yet' for days. By the time the buyer escalates, the return window may have passed.",
    howToAvoid: [
      "A tracking number is not proof of shipment — look for the first scan event at a courier facility.",
      "If a tracking number shows only 'label created' after 3 business days, escalate immediately.",
      "Require dispatched tracking (showing actual pickup/facility scan) before confirming receipt.",
    ],
  },

  {
    id: "return_swap_fraud",
    category: "logistics_fraud",
    label: "Return Swap Fraud",
    shortDescription:
      "Buyer receives genuine item, initiates return, ships back an empty box or damaged substitute to claim refund while keeping the original.",
    howItHappens:
      "Buyer purchases a valuable item (sealed Pokémon ETB, PSA-graded card). After receiving it, they raise a return request ('not as described'). They ship back an empty box, a fake item, or a damaged similar item. Seller receives a worthless return while the buyer keeps the genuine item and gets a refund.",
    howToAvoid: [
      "Photo and video every item before packing, and photograph the parcel with tracking label visible.",
      "On receiving a return, photograph the unopened return package before opening.",
      "If return contents do not match what was sent, document immediately and escalate to LetItRip support.",
      "For high-value items, add unique identifying marks (invisible ink, specific photo angles) that prove the returned item is yours.",
    ],
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/** Get a scam type definition by its ID. */
export function getScamType(id: ScamType): ScamTypeDefinition | undefined {
  return SCAM_TYPES.find((t) => t.id === id);
}

/** Get all scam types in a given category. */
export function getScamTypesByCategory(
  category: ScamCategory,
): ScamTypeDefinition[] {
  return SCAM_TYPES.filter((t) => t.category === category);
}

/** Get the category definition for a given scam type ID. */
export function getCategoryForScamType(
  scamTypeId: ScamType,
): ScamCategoryDefinition | undefined {
  const type = getScamType(scamTypeId);
  if (!type) return undefined;
  return SCAM_CATEGORIES.find((c) => c.id === type.category);
}

/** Human-readable label map for quick lookups. */
export const SCAM_TYPE_LABELS: Record<ScamType, string> = Object.fromEntries(
  SCAM_TYPES.map((t) => [t.id, t.label]),
) as Record<ScamType, string>;

export const SCAM_CATEGORY_LABELS: Record<ScamCategory, string> =
  Object.fromEntries(
    SCAM_CATEGORIES.map((c) => [c.id, c.label]),
  ) as Record<ScamCategory, string>;
