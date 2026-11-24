// ============================================================
//  EDIT ONLY THIS FILE to set up a new shop: name, colours,
//  WhatsApp, email, address and keys all live here.
//  You do not need to touch any other file (except the text in
//  src/text.js if you want another language).
// ============================================================
const config = {
  shop: {
    name: "Hussain Brothers",
    tagline: "Fresh, pure dry fruits, delivered to your door",
    phone: "0300 0000000",             // TODO: your shop phone number
    whatsapp: "923000000000",          // TODO: your WhatsApp number with country code, no + or spaces (e.g. 923001234567)
    email: "sajidali7861@gmail.com",   // owner's email (new orders are emailed here)
    address: "Main Bazaar, Gilgit",    // TODO: your shop address
    hours: "Daily 9 am to 9 pm",
    currency: "Rs",
    orderMode: "whatsapp",             // "whatsapp" = order is sent on WhatsApp only (nothing saved); "database" = saved + emailed. Owner can switch in Admin > Settings
    countryCode: "92",                 // added automatically when a number starts with 0 (e.g. 0300...)
    sizes: ["250g", "500g", "1kg"],    // starting weights. The owner can change them later in Admin > Settings
  },

  home: {
    heroTitle: "Pure dry fruits, straight from the shop",
    heroText: "Pick what you like, place your order, and we will deliver it to your door.",
    heroImage: "",                     // image URL (leave empty for a plain colour background)
    newProductDays: 30,                // how many days a product counts as "New"
    sectionLimit: 8,                   // how many products each home page section shows
  },

  // Change colours here. Light and dark mode have their own colours.
  theme: {
    defaultMode: "system",             // "light", "dark" or "system"
    radius: "14px",
    light: {
      bg: "#f6f5ef", surface: "#ffffff", text: "#1d2a22", muted: "#5c6b62",
      border: "#dcdfd3", primary: "#2f6b4f", onPrimary: "#ffffff", accent: "#b4741a",
    },
    dark: {
      bg: "#121a15", surface: "#1b2620", text: "#eaf0ea", muted: "#a3b3a8",
      border: "#2c3b32", primary: "#6fc19a", onPrimary: "#0d1a13", accent: "#e0a64b",
    },
  },

  // Only these emails can use the admin panel. Each one MUST be a user you created in
  // Firebase > Authentication > Users, and the same email must be in the Firestore rules.
  admin: { emails: ["admin@gmail.com"] },

  // Copy from Firebase console > Project settings > Your apps > Web app.
  // If apiKey is empty, DEMO mode runs (data stays in this browser only, for testing).
  firebase: {
    apiKey: "AIzaSyBX2MxtpVqbLhYKR3UpUGv0K7nix5aIuWQ",
    authDomain: "hussain-brothers.firebaseapp.com",
    projectId: "hussain-brothers",
    storageBucket: "hussain-brothers.firebasestorage.app",
    messagingSenderId: "730855144316",
    appId: "1:730855144316:web:8fdb75bdafab4aa78242f9",
  },

  // Cloudinary (images). If empty, paste an image URL by hand instead.
  cloudinary: { cloudName: "dvnv58obu", uploadPreset: "cdoevsmr" },

  // EmailJS (order email to the owner). If empty, no email is sent, but the order is still saved.
  emailjs: { serviceId: "service_n4deob8", templateId: "template_dotmsg9", publicKey: "6Rk55e86riat495MF" },
};
export default config;
