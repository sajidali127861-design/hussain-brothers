# Dry Fruit Shop (website + admin panel)

React + Firebase (login and database) + Cloudinary (images) + EmailJS (order emails to the owner).
No separate backend or hosting server is needed.

## 1. Try it first (demo mode, nothing to set up)

    npm install
    npm run dev

Open the link it prints. To view it on a phone, open the same link on the phone (same WiFi).
Admin: `/#/admin`, any email and the password `admin123` (demo mode only). Demo data stays in this browser only.

## 2. Set up the real shop

Everything shop-specific is in **src/config.js** (name, colours, WhatsApp, email, address, keys).

1. **Firebase:** create a project at console.firebase.google.com. In Authentication turn on Email/Password and add the
   owner's user. Create a Firestore Database (production mode). From Project settings, copy the web app keys into
   the `firebase` section of `config.js`. Put the owner's email in `admin.emails`.
2. **Rules:** paste the text of `firestore.rules` into Firestore > Rules and replace `owner@example.com` with the
   owner's real email (the same one as in `config.js`). Then Publish.
3. **Cloudinary:** in Settings > Upload create an "Unsigned" preset. Put `cloudName` and `uploadPreset` in `config.js`.
4. **EmailJS:** create a Service and a Template. Use these variables in the template:
   `{{shop_name}} {{order_no}} {{customer_name}} {{customer_phone}} {{customer_address}} {{note}} {{items}} {{total}}`
   and set "To email" to `{{to_email}}`. Put the three IDs in `config.js`, and allow-list your website domain in EmailJS.
5. **Deploy:** run `npm run build`, then upload the `dist` folder to Netlify or Cloudflare Pages.
   (Read the current commercial-use terms of Vercel's free plan first.)

## 3. Language

The customer website is in English. All its text is in `src/text.js`. For another language (for example Urdu)
change the words in that file, and set `dir` to `"rtl"` for right-to-left languages. The admin panel is English.

## 4. How orders are taken (owner switch)

In Admin > Settings the owner chooses:

- **WhatsApp only (default):** the customer presses "Send order on WhatsApp". Nothing is saved on the website, no email is
  sent, the Orders tab is hidden, and stock numbers do not change by themselves (change them by hand). The order is only
  real when the owner replies and confirms on WhatsApp. Needs a real WhatsApp number in Settings or `config.js`.
- **Save in database + WhatsApp:** the order is saved (Orders tab, email to the owner, stock goes down when you set it to
  Confirmed), and the customer can also confirm on WhatsApp.

Products, categories and shop details are managed in the admin panel in both modes.

## 5. Shop details and weights

The owner can change the shop name, phone, WhatsApp, email, address and opening hours from the admin panel
(Settings tab). `config.js` only holds the starting defaults. Phone and email can be seen by website visitors,
so enter only what you are happy to make public.

Each product has its own weights and prices (for example 250g, 500g, 1kg, 1 dozen, 1 box). In the product form use
"Add another weight" and "Remove". The list in Settings is only the starting list for new products, and it starts
from `shop.sizes` in `config.js`. Discount % applies to every weight of a product.

## 6. Stock

Each weight of a product has two stock controls in the product form:

- **Stock (optional):** type how many you have (for example 20). Leave it empty if you do not count stock.
  The number goes down when you set an order to **Confirmed** or **Delivered**, and comes back if you set the order to
  **Cancelled** or **New**. Customers see "Only 3 left" at 5 or fewer, and cannot put more in the cart than you have.
  At 0 the weight is crossed out and shows as out of stock.
- **In stock tick:** a manual switch. Untick it to mark a weight as out of stock without counting.

If every weight is out of stock the card shows "SOLD OUT". To hide a whole product, untick Visible instead.
Stock is only deducted when you confirm an order (not when the customer orders), so two customers ordering at the same
time cannot break the numbers. Before you confirm, check that you really have the items.

## 7. Another shop

Copy the folder, create a new Firebase project, and change only `src/config.js` and the email in `firestore.rules`.
To change colours, edit the hex codes in `theme.light` and `theme.dark`.

## 8. Mobile test

- In Chrome press F12, then the phone icon (Ctrl+Shift+M), and check every page at 360px, 390px and 768px.
- Run your live link through Google PageSpeed Insights (pagespeed.web.dev) and look at the Mobile score.
- Finally, place a test order on a real phone.

## 9. Deploying to Netlify or Vercel

1. Put the project on GitHub (or drag the built `dist` folder onto app.netlify.com/drop).
2. Netlify/Vercel: build command `npm run build`, output folder `dist` (`netlify.toml` already says this). No redirect rules are needed because the site uses `#/` links.
3. After it is live, on the live link: log in to /#/admin with the Firebase admin email, add a product with a photo, and place one test order on a phone.
4. Firebase console > Authentication > Settings > Authorized domains: add the live domain (without https://).
5. EmailJS > Security: allow only your live domain (only needed in database mode).
6. Set the real WhatsApp number in Admin > Settings.

## 10. Remember

- Admin login on real Firebase only works if the same email is in `admin.emails` in `config.js` and in the
  Firestore rules. Otherwise you see "Access denied".
- An order is saved to Firestore first, and then the email is sent. If the email fails, the order is still saved.
- If the customer does not press Send in WhatsApp, the order is still in the admin panel.
- Check the total yourself before you confirm an order.
- Hide a product before you delete it.
- Once a month, check the free limits of Firebase, Cloudinary and EmailJS.
