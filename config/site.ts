// One place to edit the public contact details, social links and footer wording.
// These are PLACEHOLDERS. Replace them before you share the site.
export const SITE = {
  name: "OncoCare BMT",
  tagline: "Outpatient companion and clinical triage for bone marrow transplant care",
  contact: {
    email: "hello@oncocare.example",
    phone: "+94 XX XXX XXXX",
    address: "Colombo, Sri Lanka",
  },
  social: [
    { name: "LinkedIn", href: "https://www.linkedin.com/" },
    { name: "Facebook", href: "https://www.facebook.com/" },
    { name: "X", href: "https://x.com/" },
    { name: "YouTube", href: "https://www.youtube.com/" },
  ],
  /** National ambulance number shown in the footer. */
  ambulanceNumber: "1990",
  languages: ["English", "සිංහල", "தமிழ்"],
} as const;

/** Anchor links in the top bar. `id` matches a section id on the home page. */
export const NAV_ANCHORS = [
  { id: "about-bmt", label: "About BMT" },
  { id: "journey", label: "How it works" },
  { id: "features", label: "Features" },
  { id: "hospitals", label: "Hospitals" },
  { id: "faq", label: "FAQ" },
] as const;
