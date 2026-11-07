# Potential improvements

Open work on this development project.

- **Contact messages.** The shop contact form asks for an email, a phone number, and a message. Sending it only shows a thank-you note. Nothing is stored or delivered. Add real message handling, and an admin page where those messages can be read and answered.
- **About and locations.** The about page and the locations page should be easy to edit from the admin, through admin navigation and an editing page, instead of only in the shop source.
- **Terms (AGB).** The terms are static placeholder text. They should be editable the same way, from an admin page.
- **Privacy (Datenschutz) and legal notice (Impressum).** Same as the terms: the current pages are placeholders, and an admin should be able to edit them from the admin navigation.
- **Product editing.** An admin should be able to create and edit products from the admin, instead of only through seed data or the API.
- **Bulk upload.** An admin should be able to upload many products at once.
- **Image editing.** An admin should be able to add, replace, and remove product images from the admin.
- **Email service.** Add an email service for password resets and for notifications, such as reservation confirmations and changes.
- **Phone notifications.** Add a phone service so the same kinds of notifications can go out by SMS or a similar channel.
- **Rental-flow notifications.** Wire those channels into the rental flow so a customer is told, at the right moments, that a reservation was created, changed, cancelled, or is ready for pickup or return.
- **Customer reviews.** After each rental, ask the customer for a review and keep that review with the reservation so the shop can read it later.
- **Admin documentation.** Add documentation inside the admin panel, with screen recordings that show how to do each task there.
- **Better sign-in.** Add third-party sign-in or a magic link, so a customer is not limited to email and password.
- **Documents from reservation data.** Generate documents from what is already stored, including receipts and order confirmations.
- **Edit existing reservations.** Let a reservation that was already made be changed afterward.
- **Payments.** Integrate a real payment provider so checkout can take payment, not only simulate it.
- **Web analytics.** Collect web analytics in the backend and show an overview of them in the admin.
- **Platform-independent self-hosting.** Run the same stack on any machine that has Docker, such as a laptop, a VPS, or a home server. The host is chosen by environment settings, not by a vendor-specific deploy, so moving from one server to another does not mean rewriting the app.
- **Fleet calendar.** Give the admin one view of which bikes are out, which are due back, and which are in the workshop.
- **Per-bike service history.** Give each bike a serial number and a record of rentals and repairs, separate from a single reservation.
- **Pickup and return photos.** Let staff record the bike's condition at handover, so a later scratch has a before and an after.
- **Deposits and damage charges.** Keep the rental price, a refundable deposit, and a damage amount separate.
- **Pricing rules.** Support weekend rates, a weekly discount, a minimum number of days, and a fee for a late return.
- **Promo codes.** Let a code change the price at checkout, and show in the admin how often it was used.
- **Group bookings.** Let one payer book several riders, with enough bikes and helmets for all of them.
- **Bundles.** Let a bike, a lock, and a helmet be offered as one package.
- **Counter check-in.** Put a QR code on the reservation so the desk can open the right booking.
- **Audit log.** Record who changed a price, a reservation, or a customer, and when.
- **White-label setup.** Let an admin edit the shop name, logo, colors, currency, and tax rate for that deployment, without a code change.
