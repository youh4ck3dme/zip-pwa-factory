export interface DemoPrompt {
  id: string;
  label: string;
  prompt: string;
  category: string;
}

// Preset demo prompts for agency PWA generation
// Each prompt contains all 10 required extraction anchors:
// 1. business type  2. business name (called ...)  3. primary feature
// 4. visual style   5. hero headline in quotes      6. concrete services/items
// 7. opening hours  8. contact footer               9. strong "..." CTA
// 10. PWA/landing page wording
export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: "barber",
    label: "Barber Shop",
    prompt: `Create a premium PWA landing page for a barber shop called Sharp & Co. Barbershop with online booking, service showcase, and bold dark theme. Hero headline "Crafted for the Modern Gentleman". Signature services: Classic Haircut, Hot Towel Shave, Beard Sculpt, and Fade & Style. Opening hours Monday to Saturday 9 AM – 8 PM. Contact footer with address and phone. Strong "Book Your Cut" CTA.`,
    category: "Business Types"
  },
  {
    id: "salon",
    label: "Beauty Salon",
    prompt: `Create a premium PWA landing page for a beauty salon called Lumière Beauty Studio with appointment booking, treatments showcase, and elegant blush-gold theme. Hero headline "Where Beauty Meets Precision". Signature treatments: Hydra Facial, Keratin Treatment, Gel Manicure, and Lash Lift. Opening hours Tuesday to Sunday 10 AM – 7 PM. Contact footer with studio address and email. Strong "Reserve Your Session" CTA.`,
    category: "Business Types"
  },
  {
    id: "restaurant",
    label: "Fine Dining",
    prompt: `Create a premium PWA landing page for a fine dining restaurant called Éclat Fine Dining with menu preview, reservation system, sophisticated dark gold theme. Hero headline "A Symphony of Flavors". Signature dishes Truffle Risotto and Duck Confit. Opening hours Wednesday to Sunday 6 PM – 11 PM. Contact footer with address and reservation email. Strong "Reserve Your Table" CTA.`,
    category: "Business Types"
  },
  {
    id: "cafe",
    label: "Coffee Shop",
    prompt: `Create a premium PWA landing page for a specialty coffee shop called Driftwood Coffee Co. with online ordering, menu highlights, and warm earthy theme. Hero headline "Every Cup Tells a Story". Signature drinks: Single Origin Pour-Over, Oat Milk Flat White, Cold Brew Tonic, and Matcha Latte. Opening hours daily 7 AM – 6 PM. Contact footer with café address and Instagram. Strong "Order Your Brew" CTA.`,
    category: "Business Types"
  },
  {
    id: "agency",
    label: "Creative Agency",
    prompt: `Create a premium PWA landing page for a creative digital agency called Nova Studio with portfolio showcase, services grid, and deep navy neon theme. Hero headline "We Build Brands That Move People". Signature services: Brand Identity, Web Design, Motion Graphics, and Digital Strategy. Opening hours Monday to Friday 9 AM – 6 PM. Contact footer with studio email and LinkedIn. Strong "Start Your Project" CTA.`,
    category: "Business Types"
  },
  {
    id: "fitness",
    label: "Fitness Studio",
    prompt: `Create a premium PWA landing page for a fitness studio called Apex Performance Studio with class schedule, trainer profiles, membership signup, and high-energy dark theme. Hero headline "Train Hard. Live Strong.". Signature classes: HIIT Burn, Power Yoga, Strength & Conditioning, and Spin Cycle. Opening hours Monday to Sunday 6 AM – 10 PM. Contact footer with studio address and WhatsApp. Strong "Join the Movement" CTA.`,
    category: "Business Types"
  },
];
