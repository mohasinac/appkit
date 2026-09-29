"use client";

/*
 * WHY: "Typing a zipcode should fill in the city" — and there was **no lookup
 *      anywhere in the codebase**. Two dead modules carried the shape of one
 *      that had been removed (`useAddressForm`, `address-validation`, both
 *      with an unused `validatePostalCode` extension point and zero
 *      consumers), which is what made it look built.
 * WHAT: `usePostalLookup` — resolve a postal code to its place and region.
 *
 * ## Zippopotam, and one code path for every country
 *
 * `https://api.zippopotam.us/{country}/{postal}` is free, needs no key and
 * covers ~60 countries. It returns place + state, not district — which is fine:
 * the user writes the locality, this fills the two fields they would otherwise
 * copy off an envelope.
 *
 * India Post's own API would be more complete for India, but it is one country
 * behind a different contract; a second provider is a second failure mode and a
 * second set of field names for a form that just spent this wave collapsing
 * eleven shapes into one.
 *
 * ## 🛑 Three rules, and each one is the difference between help and damage
 *
 * 1. **Never overwrite what the user typed.** Autofill lands only in an EMPTY
 *    city or state. A lookup that corrects a deliberately unusual address is a
 *    bug the user cannot even report — they watch their own typing vanish.
 * 2. **Fail silently and OPEN.** A network error, a 404, an unsupported
 *    country: all leave the fields exactly as they were and never block the
 *    submit. Zippopotam's India coverage is thinner than India Post's, so a
 *    miss is the common case and must be a non-event.
 * 3. **Abort in flight.** A user typing "560001" fires on every keystroke past
 *    the debounce; without an `AbortController` the answer for "56000" can
 *    land after the answer for "560001" and fill the wrong city.
 *
 * EXPORTS: usePostalLookup, type PostalLookupResult
 *
 * @tag domain:addresses
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AddressForm,AdminAddressEditorView
 * @tag sideEffects:network
 */

import * as React from "react";
import { normalizeError } from "../../../errors/normalize";
import { countryFor, isValidPostalCode } from "../../../constants/geo/countries";

export interface PostalLookupResult {
  city: string;
  state: string;
}

/** Zippopotam's response, narrowed to what is used. */
interface ZippopotamResponse {
  places?: {
    "place name"?: string;
    state?: string;
    "state abbreviation"?: string;
  }[];
}

/**
 * India Post's response, narrowed to what is used.
 *
 * `District` is the CITY. `Name` is the post office, which is what Zippopotam
 * returns as its "place name" and is the reason this second source exists.
 */
interface IndiaPostResponse {
  Status?: string;
  PostOffice?: { Name?: string; District?: string; State?: string }[] | null;
}

const ENDPOINT = "https://api.zippopotam.us";
const INDIA_ENDPOINT = "https://api.postalpincode.in/pincode";
const DEBOUNCE_MS = 400;

/**
 * 🛑 India does not go through Zippopotam, because Zippopotam has no city
 * for an Indian PIN.
 *
 * Its `places[].place name` is the POST OFFICE, and measured against the five
 * largest Indian cities not one of them returned the city:
 *
 *     560001 Bengaluru — "Rajbhavan"
 *     400001 Mumbai    — "Haji S Musafarkhana"
 *     110001 Delhi     — "Janpath"
 *     700001 Kolkata   — "Lalbazar"
 *     452001 Indore    — "Indore Jail Road"
 *
 * So the City field was filled with a street or locality on every Indian
 * address, which is worse than leaving it blank: the buyer sees a
 * plausible-looking filled field and has no reason to correct it, and the
 * courier gets an address with no city. This hook's own promise — "typing a
 * zipcode should fill in the city" — was never once kept in the only market
 * this site serves.
 *
 * India Post publishes `District`, which IS the city (Bangalore, Mumbai,
 * Indore). Note it uses the older spellings; that is the authority's own data
 * and not ours to rewrite.
 */
async function lookupIndia(code: string, signal: AbortSignal): Promise<PostalLookupResult | null> {
  const res = await fetch(`${INDIA_ENDPOINT}/${encodeURIComponent(code)}`, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as IndiaPostResponse[] | null;
  const row = json?.[0];
  if (row?.Status !== "Success") return null;
  const offices = (row.PostOffice ?? []).filter(Boolean);
  if (offices.length === 0) return null;

  /*
   * The MOST COMMON district, not the first. A PIN on a boundary returns post
   * offices from two districts — 400001 lists 'Mumbai' and 'Raigarh(MH)' —
   * and the first row is not reliably the one the buyer means.
   */
  const tally = new Map<string, number>();
  for (const o of offices) {
    const d = (o.District ?? "").trim();
    if (d) tally.set(d, (tally.get(d) ?? 0) + 1);
  }
  let city = "";
  let best = 0;
  for (const [d, n] of tally) {
    if (n > best) { city = d; best = n; }
  }
  return { city, state: (offices[0].State ?? "").trim() };
}

/**
 * Per-session cache, keyed `{country}:{postal}`.
 *
 * Module scope rather than component state: the same postal code is looked up
 * again every time the user opens the address form, and a miss is cached too —
 * re-asking for a code Zippopotam does not have is a round trip that can only
 * fail again.
 */
const CACHE = new Map<string, PostalLookupResult | null>();

export interface UsePostalLookupOptions {
  /** Called with the resolved place. Only ever fires on a hit. */
  onResolved: (result: PostalLookupResult) => void;
  /** Skip the lookup entirely — e.g. while the form is submitting. */
  enabled?: boolean;
}

export interface UsePostalLookupResult {
  /** Feed it the current postal code and country on every change or blur. */
  lookup: (postalCode: string, country: string) => void;
  /** True while a request is in flight. Purely for a spinner; never gates. */
  isLooking: boolean;
}

export function usePostalLookup({
  onResolved,
  enabled = true,
}: UsePostalLookupOptions): UsePostalLookupResult {
  const [isLooking, setIsLooking] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  /*
   * The callback in a ref so `lookup` is stable across renders. Without it
   * every keystroke re-creates the debounced function and the timer never
   * survives long enough to fire.
   */
  const onResolvedRef = React.useRef(onResolved);
  onResolvedRef.current = onResolved;

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const lookup = React.useCallback(
    (postalCode: string, country: string) => {
      if (!enabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();

      const code = postalCode.trim();
      const def = countryFor(country);
      // Only ask once the code is plausibly complete for this country, so a
      // half-typed PIN does not spend a round trip proving itself wrong.
      if (!def || !isValidPostalCode(country, code)) return;

      const key = `${def.code}:${code}`;
      const cached = CACHE.get(key);
      if (cached !== undefined) {
        if (cached) onResolvedRef.current(cached);
        return;
      }

      timerRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortRef.current = controller;
        setIsLooking(true);

        /*
         * India has its own source — see `lookupIndia`. Everywhere else keeps
         * Zippopotam, whose "place name" IS the city outside India.
         */
        const request: Promise<PostalLookupResult | null> =
          def.code.toUpperCase() === "IN"
            ? lookupIndia(code, controller.signal)
            : fetch(`${ENDPOINT}/${def.code.toLowerCase()}/${encodeURIComponent(code)}`, {
                signal: controller.signal,
              })
                .then((res) => (res.ok ? (res.json() as Promise<ZippopotamResponse>) : null))
                .then((json) => {
                  const place = json?.places?.[0];
                  return place
                    ? {
                        city: place["place name"] ?? "",
                        state: place.state ?? place["state abbreviation"] ?? "",
                      }
                    : null;
                });

        void request
          .then((resolved) => {
            /*
             * A result with neither field is a miss, not a hit — handing the
             * form two empty strings would clear nothing and resolve nothing,
             * while caching it as success hides a real answer for the session.
             */
            const result = resolved && (resolved.city || resolved.state) ? resolved : null;
            CACHE.set(key, result);
            if (result) onResolvedRef.current(result);
          })
          .catch((err: unknown) => {
            const normalized = normalizeError(err);
            /*
             * Deliberately silent. An abort is the expected path when the user
             * keeps typing, and a real failure must leave the fields editable
             * rather than tell the buyer their postcode is wrong when it is
             * our upstream that is down. Not cached, so a transient failure
             * does not poison the code for the session.
             */
            void normalized;
          })
          .finally(() => {
            if (abortRef.current === controller) {
              abortRef.current = null;
              setIsLooking(false);
            }
          });
      }, DEBOUNCE_MS);
    },
    [enabled],
  );

  return { lookup, isLooking };
}
