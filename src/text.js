// Customer-facing website text lives here (currently English).
// For another language, change the words in this file, and set dir to "rtl" for right-to-left languages like Urdu.
export const dir = "ltr";
export const lang = "en";
export const currencyAfter = false; // false: "Rs 1,200", true: "1,200 Rs"
export const t = {
  nav: { home: "Home", products: "Products", cart: "Cart" },
  mode: { toDark: "Dark", toLight: "Light", aria: "Switch between dark and light mode" },
  footer: { whatsapp: "Chat on WhatsApp", admin: "Admin" },
  common: { loading: "Loading...", loadError: "Could not load data. Check your internet and reload the page.", seeAll: "See all", errorTitle: "Something went wrong", errorText: "Please reload the page. If it keeps happening, please contact the shop.", reload: "Reload page" },
  home: { cta: "View products", categories: "Categories", popular: "Popular", fresh: "New arrivals", offers: "Special offers", empty: "No products available yet." },
  shop: {
    title: "Products", search: "Search products", all: "All", none: "No products found for this search or category.",
    add: "Add to cart", added: "Added to cart", soldOut: "Out of stock", soldTag: "SOLD OUT", left: (n) => `Only ${n} left`, maxInCart: (n) => `Only ${n} available`, outAria: (l) => `${l}, out of stock`, fresh: "NEW", off: (d) => `${d}% OFF`, pickSize: "Choose weight",
  },
  cart: {
    title: "Cart", sendWa: "Send order on WhatsApp", waNote: "Your order is confirmed only when we confirm it on WhatsApp.", waNotReady: "Online ordering is not set up yet. Please call the shop to order.", sentTitle: "Your order is ready to send", sentCode: "Your order code:", sentText: "WhatsApp should have opened with your order. Press Send there. Your order is confirmed only after we reply to you on WhatsApp.", openWa: "Open WhatsApp again", backToCart: "Change my order", errSlow: "This is taking longer than usual. Your order may still go through, so please check with the shop on WhatsApp before ordering again.", maxNote: (n) => `Only ${n} available`, empty: "Your cart is empty.", browse: "Browse products", less: "Decrease quantity", more: "Increase quantity", total: "Total",
    delivery: "Delivery details", name: "Name", phone: "Phone", address: "Address", note: "Note (optional)",
    errName: "Please enter your name.", errPhone: "Please enter a valid phone number.", errAddress: "Please enter your full address.",
    errSave: "Your order could not be saved. Check your internet and try again. Your cart is safe.",
    order: "Place order", busy: "Placing order...",
    doneTitle: "Order received", doneNo: "Your order number:", doneNote: "Please keep it. We will contact you soon.",
    confirmWa: "Confirm on WhatsApp", waOptional: "Sending the WhatsApp message is optional. Your order is already saved.", more2: "Continue shopping",
  },
  wa: { newOrder: "New order", name: "Name", phone: "Phone", address: "Address", total: "Total" },
};
