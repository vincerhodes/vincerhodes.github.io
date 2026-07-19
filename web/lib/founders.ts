// The four founding squashers (see app/(main)/founding-squashers) — the only valid saved_by
// names for the shared drill library. Validated server-side in app/api/drills/route.ts and
// offered as the "Your name" dropdown in components/DrillBuilder.tsx.
export const FOUNDERS = ["Jimmy", "Joe", "Adam", "Jonny"] as const;
export type Founder = (typeof FOUNDERS)[number];

/** localStorage key remembering which founder last saved a drill from this browser. */
export const SAVER_NAME_KEY = "rc_saver_name";
