# **Reloved — Product Requirements Document v2**

Sep 28, 2026 

Mobile-first web app for buying and selling preloved women's clothing in Pakistan. Built by two people in five weeks, soft launch in week 3\. 

**Competition constraint.** The AI Builder Cup prototype is due 18 October, which lands inside week 4\. It needs a proposal deck, a working prototype built with Google Cloud AI tools and deployed on Google, and a three-minute video. The Google Cloud requirement constrains the stack, so confirm the exact wording in the rules before CLAUDE.md is finalised.

## **North star statement**

A woman anywhere in Pakistan finds a preloved item in her size and brand, and messages the seller about it on WhatsApp in under two minutes.

Every feature is checked against this sentence. If it does not shorten the distance between a buyer and a seller she can message, it does not get built in v1.

## **Anti-goals**

Ranked by how tempting each one is, most tempting first. When Claude Code proposes any of these, the answer is already written down.

1. **In-app chat.** Hardest to refuse, because it is what OLX does and it is the only way to keep a seller's number hidden. Costs roughly a week of build: message storage, unread counts, notifications that barely work on mobile web, and moderation when someone sends something awful. WhatsApp already carries the conversation. The v2 version to revisit: a buyer expresses interest in-app, and only a genuinely interested pair moves to WhatsApp.  
2. **Automated reminder messages to sellers.** Nudging a seller to mark an item sold is real value, but at 15 listings it is ten minutes of manual messaging per week versus three days of build.  
3. **Seller reviews and ratings.** Needs transaction data that does not exist yet. With 15 listings it produces a graveyard of empty profiles, which reads worse than no reviews at all. The sold count on the seller profile carries the trust signal until then.  
4. **Saved searches and new-stock alerts.** The strongest buyer-side hook in the whole product, and still out. It is worth building the week after launch, not the week before.  
5. **AI deciding what goes live.** The AI helps the seller before she submits — checking her photos are usable and prefilling attributes — and it may summarise a listing for us in the queue. It never approves, rejects or hides anything. Two people reviewing 15 listings are faster and more accurate than any filter we could ship in five weeks, and an automated rejection with no human behind it is exactly the experience we are replacing.  
6. **Duplicate-listing detection.** Newest-first ordering plus free relisting creates the incentive Vinted had to engineer against, but only at scale. At 15 listings the approval queue is the detection.  
7. **In-app payments and integrated shipping.** Regulated, operations-heavy, and not what is broken about buying preloved on Instagram.  
8. **Native mobile app.** App store review could eat the week 3 soft launch. A mobile web app is also shareable as a link, which is how buyers arrive.  
9. **Commission or listing fees.** Charging nothing is the wedge against the Instagram pages taking 20%. Revenue is a post-traction conversation.  
10. **Wedding and formal wear, kidswear, menswear, unstitched fabric, and accessories.** Each carries its own sizing system, its own buyer, or in the case of jewellery and bangles a whole second taxonomy. Adding them later costs about an hour each; adding them now makes 15 listings look scattered instead of curated.

## **Users and views**

Three user types. The same listing looks different depending on who is looking at it, and that difference is a build requirement, not a detail.

**Buyer.** Browses and searches with no account. Sees the listing's photos, details, condition, fit note, price, and the seller's profile with her sold count. Does not see view or contact counts — a public view counter reads like the countdown timers on cheap shopping sites and does nothing for her. Creates an account, by email only, at the moment she taps Message seller. No phone number is ever asked of a buyer.

**Seller.** Creates an account by email, verified, at the point she submits her first listing, and adds a phone number verified by code, because that number is what the WhatsApp button uses. On her own listing she sees everything a buyer sees plus how many people viewed it, how many tapped contact, its status, and the controls to edit, mark sold or relist. Changing her phone number later re-triggers verification.

**Admin.** The two of us. Reviews the queue, acts on reports, and nothing else — there is no analytics dashboard in v1.

### **What each user sees on a listing**

|  | Buyer | Seller (own listing) | Admin |
| :---- | :---- | :---- | :---- |
| Photos, details, condition, fit note, price | Yes | Yes | Yes |
| WhatsApp contact button | Yes | No | No |
| View count and contact count | No | Yes | Yes |
| Edit, mark sold, relist | No | Yes | No |
| Status and rejection reason | No | Yes | Yes |
| Approve, reject, hide, restore | No | No | Yes |
| Seller's other listings alongside | On her profile | — | In the queue, as the duplicate check |

## **Domain model**

Six entities. Defined before any code is written, so the next forty prompts compound on a stable schema instead of generating migrations.

![][image1]

### **User**

One record per email address. Buyers, sellers and admins are the same entity — the difference is what they have done, not a role field. A seller is a user with a verified phone number and at least one listing; an admin is a user with the flag set.

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| email | string | Unique. The account identity for everyone. Verified before first listing (seller) or first contact (buyer) |
| email\_verified\_at | timestamp | Null until verified |
| phone | string | E.164. Sellers only — never asked of a buyer |
| phone\_verified\_at | timestamp | Null until verified. Cleared whenever phone changes, which re-triggers verification |
| display\_name | string | First name only, shown publicly |
| city | enum | From the maintained city list. Auto-fills the city on her listings |
| bio | text | Optional, shown on profile |
| avatar\_url | string | Optional, defaults to a generated avatar |
| is\_admin | boolean | True for the two of us |
| created\_at | timestamp | Shown as "joined" on profile |

Sold count is not stored. It is a count of her listings at status sold, shown on her public profile as the trust signal that stands in for reviews.

Sample row: { email: "sara@example.com", phone: "+923331234567", display\_name: "Sara", city: "islamabad", bio: "Clearing out my closet", is\_admin: false }

### **Listing**

The core entity. Status drives everything the buyer, the seller and the admin see.

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| seller\_id | uuid | → User |
| title | string |  |
| description | text | Free text in her own words. **Flaws live in here too**: flaw\_note was merged into this field on 8 Oct. Prompted on the form with "e.g. worn 3-4 times, fits true to size. small mark near the sleeve." |
| brand | enum | Fixed list of \~30, plus other |
| brand\_other | string | Only when brand is other |
| category | enum | kurta, pret, co\_ord\_set, dupatta, dress, top, bottoms, jeans, skirt, jacket, sportswear, shoes, bag |
| colour | string | Plain everyday words. Filled by photo-to-listing and used by search. **Not shown on the sell form** as of 8 Oct, so it is captured but not editable by the seller. No fixed list yet |
| size | string | Clothes: XS–XL. Shoes: UK 3–9. **Bags and dupattas: null** (no size field shown) |
| measurements | string | Optional free text, inches |
| material | enum | **Not agreed yet.** 20 fabrics in `MATERIALS`, lawn and khaddar first, plus `other`. Replaced fit\_note on the sell form on 8 Oct. Needs Bismah's agreement before buyers filter on it |
| fit\_note | text | Optional, all categories. **No longer on the sell form** as of 8 Oct, replaced by material. Still specified here: decide whether to delete it or keep it for later |
| condition | enum | brand\_new\_with\_tags, brand\_new\_without\_tags, very\_good, fair — each shown with its description |
| is\_replica | boolean | Required declaration, not inferred |
| asking\_price | integer | PKR |
| original\_price | integer | Optional, PKR |
| is\_negotiable | boolean |  |
| city | enum | Auto-filled from the seller's city, editable. 33 cities plus `other` |
| city\_other | string | **Not built yet.** Only when city is `other`, mirroring `brand_other`. Needs Bismah's agreement before it is added, because buyers see the city on browse and item detail |
| status | enum | pending, live, rejected, sold, expired, hidden |
| rejection\_reason | enum | bad\_photos, missing\_details, not\_allowed, suspected\_counterfeit |
| view\_count | integer | Seller and admin only |
| contact\_count | integer | Seller and admin only |
| created\_at | timestamp | Drives newest-first ordering |
| expires\_at | timestamp | created\_at \+ 30 days |

**Condition scale.** Four options, each shown to the seller with its description so two sellers mean the same thing by the same word:

| Value | Label | Description shown on the form |
| :---- | :---- | :---- |
| brand\_new\_with\_tags | Brand new with tags | With tags, never worn |
| brand\_new\_without\_tags | Brand new without tags | No tags, never worn |
| very\_good | Very good | Well worn, but still in great shape |
| fair | Fair | Shows some signs of wear — please photograph the areas that show it |

Sample row: { title: "Khaadi lawn kurta", brand: "khaadi", category: "kurta", size: "M", condition: "very\_good", fit\_note: "Roomy, would fit a large too", is\_replica: false, asking\_price: 3000, original\_price: 8500, is\_negotiable: true, city: "lahore", status: "live" }

### **Photo**

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| listing\_id | uuid | → Listing |
| url | string |  |
| position | integer | Display order |
| is\_cover | boolean | The seller picks which photo leads in browse — it is not simply the first she uploaded |
| quality\_flags | json | What the pre-submit check found, per photo: blurry, dark, busy\_background, blends\_into\_background, item\_cropped, crooked. Advisory to the seller; never blocks submission |

Two to six per listing, enforced at submit. Exactly one is\_cover.

### **ContactEvent**

Fired when an email-verified buyer taps the WhatsApp button. This is the week 3 success metric, so it is a first-class record, not a counter.

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| listing\_id | uuid | → Listing |
| buyer\_id | uuid | → User |
| created\_at | timestamp |  |

One row per tap. Rate limit: 10 per buyer per day.

### **ModerationAction**

An append-only log, not a status field. Keeps the history of why a listing was approved, rejected or hidden.

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| listing\_id | uuid | → Listing |
| admin\_id | uuid | → User |
| action | enum | approved, rejected, hidden, restored |
| reason | enum | Same list as rejection\_reason |
| report\_id | uuid | Optional → Report. Set when this action resolves a report |
| created\_at | timestamp |  |

A row is written on four events, and nothing else:

* **approved** — a pending listing is approved, status → live  
* **rejected** — a pending listing is rejected with one of the four canned reasons, status → rejected  
* **hidden** — a live listing is taken down, either by one of us or automatically when a second unresolved report lands (the system is the actor there, so admin\_id is null)  
* **restored** — a hidden listing is put back

A seller marking an item sold, or a listing expiring at 30 days, is not moderation. Those change the listing's status and write no row here.

### **Report**

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | uuid |  |
| listing\_id | uuid | → Listing |
| reporter\_id | uuid | → User |
| reason | enum | counterfeit, not\_as\_described, inappropriate, spam |
| detail | text | Optional |
| resolved\_at | timestamp | Null until an admin acts |

Two unresolved reports auto-set the listing to hidden. The reporter is told the outcome.

## **Critical paths**

Three flows. Anything not sitting on one of them goes in the backlog file, which Claude Code never reads.

![][image2]

### **Path 1: List an item**

1. She taps Sell. No account yet.  
2. She is prompted to upload photos or take them there, with short tips on what makes a photo work: daylight, plain background, the whole item in frame, a close-up of any flaw.  
3. The AI checks the photos are usable — sharp, well lit, the whole item in frame, straight, and standing out from the background. If something is weak it says so and offers a retake. It never blocks her from continuing.  
4. The AI reads the photos and fills in brand, category, colour and condition. It does not suggest a price — she sets her own asking price at step 6.  
5. She corrects whatever is wrong. This is expected, not a failure — Pakistani brands are the hard case.  
6. She picks which photo leads, adds size, city (pre-filled from her profile), asking price, fit note if the fit is unusual, and ticks whether it is a replica.  
7. She taps Submit. Only now is she asked for her email and her phone number: email verified by link, phone verified by code.  
8. She sees that her listing is under review and will be live within a day.

Account creation sits at step 7 on purpose. Asking upfront loses sellers before they have invested anything, and both the email and the number are needed for the listing regardless. If the phone code fails to arrive, she can continue with email alone and we chase the number by hand — a broken code service must never block a listing.

### **Path 2: Approve a listing**

1. Either of us opens the queue and sees everything pending, oldest first.  
2. Each item shows its photos, its details, and the seller's other active listings beside it — that adjacency is the duplicate check at this scale.  
3. Before approving, we tap the WhatsApp button ourselves. If the number is not on WhatsApp, the listing is dead on arrival and we catch it here rather than after it goes live.  
4. Approve, and it goes live immediately at the top of browse.  
5. Reject, and pick one of four canned reasons. The seller gets an email with the reason and a link back to edit and resubmit.

Target turnaround is 24 hours. Silence is what makes sellers give up. There are no in-app notifications in v1, so every message to a seller — rejection, approval, a nudge — goes by email or by one of us on WhatsApp.

### **Path 3: Find and message**

1. She lands on the homepage or straight on browse, newest first, no account needed.  
2. She filters by brand, category, size, city and condition. City defaults to her own with an all-cities option, and the homepage explains why it is there: finding a seller nearby means she can arrange same-day pickup instead of waiting on a courier.  
3. She opens an item and sees the photos, condition with its description, fit note, any flaws, whether it is a replica, and the asking price against the original.  
4. She taps Message seller.  
5. First time only: she logs in, or creates an account, in a sheet over the listing. No phone number is asked of her. **Built 14 Oct:** signed out, the tap opens a sheet with email and password and a link to the full sign-up page, which returns her to this listing afterwards. Signed in, the tap opens WhatsApp and nothing else happens.  
6. WhatsApp opens with a message already written: "Hi, I'm interested in your \[item\] on \[app name\]."

Step 6 is the only metric that matters in week 3\. Every ContactEvent is a row, not a counter.

### **Path 4: Admin**

Drafted for review — this is the part we had not specified. Deliberately small: a working queue, not a dashboard.

**Queue.** One list, pending oldest first, with a count. Each row: cover photo, title, brand, category, price, seller name, and her other active listings. Opening a row shows every photo full size and every field. Two buttons: Approve, and Reject with a reason. Anything approved or rejected drops off the list.

**Accounts.** A second list beside the queue, added 14 Oct. Everyone who has signed up, newest first, with the ones needing work at the top: a WhatsApp number we have not checked yet. Each row shows her name, email, city, how many listings she has, and her number with a link that opens it in WhatsApp. One button, "I have checked this", which is what sets `phone_verified_at`. A buyer has no number and is labelled as such rather than flagged, because nothing is owed from her.

**This check is manual on purpose, and only for now.** Checking a number means one of us opening its WhatsApp link and seeing a real account answer. Once the WhatsApp Business account with Meta is approved we can send that message and record the reply automatically, and this list becomes a list of answers rather than a list of jobs. Nothing about the data model changes when that happens: `phone_verified_at` is still the one field that matters, and a seller still cannot write it herself. Until then, every row is a person one of us has to message.

**Reports.** A third list in the same place, unresolved first. Each shows the listing, the reason, the reporter's detail, and how many reports it has. Actions: hide, restore, or dismiss the report. A listing that reached two unresolved reports is already hidden when we get there, flagged as auto-hidden so we know the system acted, not one of us. Whatever we decide, the reporter gets an email telling her we looked.

**Listing lookup.** Search by title, seller or status, so a seller asking "where is my listing?" on WhatsApp can be answered in ten seconds. Read-only apart from hide and restore.

**Not in the admin view:** user management, bulk actions, analytics, editing someone's listing on her behalf, a separate reports screen. If we need any of these by week 4, that is a finding worth writing down.

### **The marketing homepage**

The homepage is the entry point for both sides. Not a separate site, not a separate address — it is what the site's root shows, and Browse all leads into the listings page.

* **Hero.** What the app is, in one line, and the two things a person can do here.  
* **Proposition.** The pitch differs for buyers and sellers, and the switch between them should be something we design rather than a default segmented toggle — a swipeable card or similar. Both pitches end in the same place: no commission, nothing extra to pay, every listing checked by a human.  
* **Curated selections.** A few categories or featured items, each linking into browse with that filter applied. This is also where the city filter gets explained — find sellers near you, arrange pickup the same day.  
* **Browse all** into the listings page.

Visual direction from the call: minimal, close to black and white, no coloured calls to action, because the clothes in the photos will carry all the colour the page needs.

### **The loop closes**

The seller marks the item sold from her listings page, where she also sees her view and contact counts. We message her by hand to prompt this, and manually clear anything past 30 days. The counts are what make the prompt worth answering — Instagram sellers cannot see any of this.

**AI in the product**

Four features, all of them on the critical paths rather than bolted on. The rule that governs every one: the AI reads, drafts and flags; a person decides.

### **1\. Photo to listing (seller side, already in Path 1\)**

She uploads photos, the model checks they are usable and then fills in brand, category, colour and condition. Price is hers alone: we suggest nothing until we have real sales to learn from. She corrects whatever is wrong. This is the feature that removes the reason people list on Instagram instead — the form is the work, and this deletes most of it.

### **2\. Natural-language search (buyer side)**

One box. "Black Sapphire kurta under 3000 in medium" becomes structured filter values: brand Sapphire, category kurta, colour black, size M, maximum price 3000\. The filters stay, and whatever the model extracted shows as applied filter chips she can adjust, so a wrong parse is visibly wrong and fixable rather than silently returning nothing.

This is the strongest addition of the three. It sits directly on the north star — it removes the filter-tapping between a buyer and the item she wants — and it is a small build: one model call converting a sentence into values the browse page already accepts. Call the model only when the query is not a plain keyword match, and debounce it, or the cost scales with keystrokes rather than searches.

**Risk:** with 15 listings, a precise query returns nothing and the feature looks broken. Falling back to a partial match, and saying which filter was relaxed, matters more here than the parsing itself.

### **3\. Approval copilot (admin side, in the queue)**

Beside each pending listing, a short summary for whoever is reviewing: what the photos show, whether the stated brand looks consistent with them, whether the asking price is sane against the original, and whether the photos show a flaw the seller did not mention in her description. We still approve or reject. The AI does the reading.

This protects the 24-hour turnaround, and it is the half of the product nobody else demos — everyone builds the shiny buyer side.

### **4\. Catalogue-photo detection (fraud)**

A specific fraud in Pakistani resale: posting the brand's own product photo instead of the item being sold. A studio shot looks different from a photo taken on a bed in daylight, and that difference is detectable. It surfaces as a flag in the queue, never an automatic rejection — a seller with good lighting and a plain wall must not be punished for it.

## **Changes since this document was written**

Decisions taken during the build that differ from the spec above, or that resolve a conflict between this document, `design-system.md` and `components.html`. Anything here is **agreed and live in the code**. Anything still open says so.

| Date | Change | Why | Status |
| :---- | :---- | :---- | :---- |
| 2 Oct 2026 | **Dupattas have no size**, like bags. The `size` row above originally exempted bags only | A dupatta is a scarf. There is no XS to XL for it | Agreed, built. `SIZE_OPTIONS` in `lib/constants.ts` |
| 2 Oct 2026 | **`city` gains an `other` value**, last in the list, after 33 named cities | The north star is a woman *anywhere* in Pakistan. A fixed list of 33 is a dead end for everyone else | Agreed, built |
| 2 Oct 2026 | **`city_other` free-text field** to pair with `other` | Without it, `other` tells a buyer nothing. Mirrors `brand_other` | **Open.** Needs Bismah's agreement: buyers see the city on browse and item detail |
| 2 Oct 2026 | **Condition scale: this document wins** over `components.html`, which had Brand new / Excellent / Very good / Good | The two disagreed on meaning, not just wording: `components.html` had "no tags, worn a few times" where this document has "no tags, never worn". Different items. The values here also feed the Gemini prefill schema | Agreed. Amna is updating `components.html` to match |
| 2 Oct 2026 | **Bottom sheet CTAs stack vertically**, primary on top | `components.html` lays them out in a row; `design-system.md` says "Never side-by-side". The design system won | Built. Flagged to Bismah |
| 2 Oct 2026 | **No Tailwind.** Plain global CSS in `app/globals.css` | The design system already existed as vanilla CSS with custom properties. Converting it would have added a package and a chance to drift | Agreed, built |
| 2 Oct 2026 | **`FilterChip` is a `<button>`**, not a `<div>` as in `components.html` | A div cannot be tabbed to, activated by keyboard, or announced as a control. Visually identical | Built. Flagged to Bismah |
| 2 Oct 2026 | **`BottomSheet` is `position: fixed` in a portal**, not `absolute` | In `components.html` it sits inside a `.phone-frame` mock that only exists on that static page | Built. Flagged to Bismah |
| 2 Oct 2026 | **Colour list still does not exist** | Call 1 already returns a `colour` and `Listing.colour` is specified above, so nothing can validate it | **Open.** Real gap, not a nicety. The field is a free-text box on the sell form in the meantime |
| 5 Oct 2026 | **`colour` added to the Listing table above** | It was named in the flow description and in the row above, but missing from the field list. Documentation gap, not a new field | Corrected |
| 5 Oct 2026 | **The sell flow is photo-first**, modelled on eBay: guide, photos, AI read, then the form | She never opens a blank form. The form arrives part filled, with every AI answer marked | Built, branch `seller` |
| 5 Oct 2026 | **No viewfinder of our own.** `capture="environment"` hands her to the phone's camera app | Rebuilding focus, exposure and a shutter is work we do not need, and a half-finished viewfinder encourages fewer photos | Built |
| 5 Oct 2026 | **The photo guide shows once**, then lives behind "How to photograph it" | Remembered in `localStorage`, not on the User record: it is a convenience, and a new phone showing it again is the right outcome | Built |
| 5 Oct 2026 | **`title_suggestion`, `colour` and `flaws_seen` carry no confidence** | `listingDraftSchema` has no `colour_confidence` or `title_confidence`, so those three are marked "AI suggested" without a confidence claim rather than being given one we invented | **Open.** Adding the two fields to the schema is a small change |

| 8 Oct 2026 | **`material` added to Listing**, replacing fit\_note on the sell form | Buyers here shop by fabric as much as by brand: lawn and khaddar are seasons, not just materials | **Open.** Needs Bismah's agreement |
| 8 Oct 2026 | **`colour` removed from the sell form**, still captured | Amna's call. She cannot correct a wrong colour, and buyers filter on it | Built. Revisit with the colour list |
| 8 Oct 2026 | **`flaw_note` merged into `description`** | One box in her own words, flaws included. Nothing existed in a backend yet, so there was nothing to migrate | Settled. The copilot check is re-pointed, see below |
| 8 Oct 2026 | **The approval copilot compares the AI's `flaws_seen` against her description**, not description against a flaw field | The flaw field no longer exists. Comparing what the photos show against what she wrote is the more useful direction anyway: it catches a flaw she left out, which is what the check was for | Settled |
| 8 Oct 2026 | **Form fields are transparent, not white** | A screenful of white boxes on the cream canvas reads as a different background from every other screen | Built app-wide. Flagged to Bismah: it changes the report form and browse filters too |
| 8 Oct 2026 | **"Build my listing" is disabled below two photos** | `design-system.md` says never disable the next button. Reversed: the grid is the error, and a line under it says what is missing | Built. Flagged to Bismah, it is a design-system rule |
| 8 Oct 2026 | **AI suggestions marked with a sparkle, not the words "AI suggested"** | Amna's call. Tapping the sparkle gives a tooltip; one line under the heading explains the form as a whole | Built. The trade is discoverability |
| 8 Oct 2026 | **"Please check" dropped from medium confidence**, and the brand evidence line removed | Amna's call | Built. High and medium now look identical to her; the distinction survives in the data |
| 8 Oct 2026 | **Only the phone is verified at submit, not the email** | Amna's position. Removes the email link and the different-browser claim flow, which was the most expensive part of the seller build | **Open and consequential.** This document's own fallback is "if the phone code fails, she continues with email alone", which has nothing to fall back to. A seller whose SMS never arrives cannot sign back in |

| 13 Oct 2026 | **Accounts are email and password**, created on a page of their own at `/account`, not by an email link | The menu needs a way in for a seller who has not listed anything yet, and the sell flow's account step is reached from Submit and nowhere else. One account serves both sides | Built. The email link described above is not implemented and `email_verified_at` is still never set |
| 14 Oct 2026 | **A seller marks her own listing sold, and can undo it** | Live to sold and back, hers only, checked on the server. It is the one status change a seller makes herself | Built. `POST /api/listings/[id]/sold` and `/unsold`. No ModerationAction is written, per the four-event rule above |
| 14 Oct 2026 | **Unsold returns a listing to live, not to the queue** | That listing was approved once already. Sending it round again would make a mistyped tap cost her another day of waiting | Built. `expires_at` is not extended either: it keeps the 30 days it was given when posted |
| 14 Oct 2026 | **The buyer gate is a sheet over the listing**, not a page | She is one tap from the thing she wants, and a new screen loses the listing she was looking at. Signing up is still a full page, because it has a name and a password on it, and `?next=` brings her back | Built. Flagged to Bismah: no design for it in `components.html` |
| 14 Oct 2026 | **ContactEvent is written, and the number is fetched on the tap** | A number shipped with the page made the catalogue a phone book: every live listing's number was readable by anyone who opened it. Now it is handed out one tap at a time, by `POST /api/listings/[id]/contact`, which writes the row and increments the count | Built. The week 3 metric counts for real |
| 14 Oct 2026 | **The contact cap is 10 a day per buyer, counted in Pakistan time** | The cap is specified above. The day that matters is hers: every buyer and seller is in one country, and PKT has no daylight saving so a fixed offset is safe | Built. Needs the `contact_events` composite index deployed |
| 14 Oct 2026 | **The cap fails open if its index is missing**, and logs loudly | Blocking every buyer in the country is worse than letting a few through uncapped. The cap is spam protection, not correctness, and messaging a seller is the north star | Built, deliberate. Anything in that log means: deploy the indexes |
| 14 Oct 2026 | **A buyer is gated by having an account, not by a verified email** | `email_verified_at` is still never set by anything, so gating on it would gate on nothing | **Open.** This document says email-verified. Either verification gets built or this row becomes the spec |
| 14 Oct 2026 | **All sample data deleted.** Browse, item detail and seller profiles read Firestore and nothing else | Keeping a fallback meant every screen had two code paths and we could not tell a bug from a mock. An empty grid is an honest answer | Built. `lib/sample-data.ts` and `lib/useCurrentUser.ts` are gone, with the sellers s1 to s8 and their listings |
| 14 Oct 2026 | **A seller's public profile is `GET /api/sellers/[id]`** | Her user document holds her email and her phone, and Firestore rules cannot hide individual fields, so the browser is never given the document. The route picks the safe fields | Built. Name, city, bio, sold count and her live listings |
| 14 Oct 2026 | **Phone verification is manual, by one of us, from the admin Accounts list** | There is no SMS code and no WhatsApp Business account yet | Built. Becomes automatic once Meta approves the WhatsApp Business account; the field and the rules do not change when it does |

## **Read-it-back check**

Before building, paste this document into Claude Code and ask for a three-sentence product summary and the top five risks. If the summary reads wrong, or the risks surface something not in this document, the document is not finished. The test is whether the model derives the right product from it, not whether we think it is clear.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAAE4CAYAAADb8M4/AAA1eElEQVR4Xu3d958V1f348c/vsRAsIEVgFRDpZcFlKSJF6QuCiorUyFK2L8SgxmgMscZYsKLGiF3E3mP/6CdNE0sSNRIVCyhi/oPz5T18z3jmnNll7+7M3Jk7rx+ej71zZu7cu8OF+2Jm7tz/+dGPfqQAAACQHf9jDwAAACDdCDgAAICMIeAAAAAyhoADAADIGAIOAAAgYwg4AACAjCHgAAAAMoaAAwAAyBgCDgAAIGMIOAAAgIwh4AAAADKGgAMAAMgYAg4AACBjCDgAAICMIeAAAAAyhoADAADIGAIOAAAgYwg4AACAjCHgACDHFixYoNauXatqamqQU2eddZYaOXKk89pAuhFwAJBD69atU+ubm9WoUaNUjx7dVbduRyGnBg0apE4//TTV2Nio5s+f77xWkE4EHADkSFlZmaqvr1fl5aOcN3KgqmquqqutdV43SB8CDsiRQw89VHXq1KlkyO9j/45oWefOnVVDQ4Pzpg2YRo8uJ+IygIADcuDwww9XRxxxRMk67LDDnN8ZLjnfqV+/vs4bNmCbM2eO8/pBuhBwQAk75JBDnNgpZQcffLCzDbDfgAEDVHV1tfNGDbREPuBiv46QHgQcUKJkr5QdOHnw4x//2NkW+JF3SMx+gwZa09TU6LyOkB4EHFCi7LDJE3tb4Eec+4aCbdiw3nkdIT0IOKAE5XXvm8ZeOFdjIwGHwjQ01HsfFrJfS0gHAg4oQXbQ5JG9TfKOgEOhCLh0I+CAEmTHTBLkYrBdu3Z1xttL1mePFcLeJnlHwKFQBFy6EXBACbJjJgmvv/asamxY54y3l6zPHiuEvU3yjoBDoQi4dCPggBJkx4ypZ48e6qU/POEFUlgkPfnEg974/fffGRhvaqxRv7zkAvXUkw9581984XF15JFHevPWrPmJvz6xZMlZ/v302FNPPeQ81tatt/nzL7zwp8597Od46aUXhi4fxt4meUfAoVAEXLoRcEAJsmPGJPHzs581ebenT5+mXnn5KX/ea/vmXX/dld6h0HvvuV298Pxj/jwJuNtuvU6NGDFcdenSRT322P1+XB19dE/vtgRW//79vEiU8Qsu2KBmzjzFC72bbromEGMjRw5X2x6+W/Xq1WvfOod5884/f703T9Yh0/JTmM9dHqtv32O92/Pnz3V+P23G9JMLNvD4AS2yt3HWEHAoFAGXbgQcUCIkMiRC1lSvdGJG27LlBvXE4w8ExoYOHez9rKtbEwgsIdNzZs/wbkvAhc03b9uHUPW6hUScvby5bK9eRweWt+eLe7Zu8W8fe+wxatDA451ltMt/fUlqyZ+RsOPR/jNtD71+e5yAQ6EIuHQj4ICM0HuC5M3ZDgI7DuyY0SSKamuqnXEhhzhvueXawNjzz21XN1x/lXe7PQEnJBplnhZ23zBh8/U65HmOHXuCM99kb79iMPfgmbGmA87+s2sLM/7Cos9cVpbR4wQcCkXApRsBB6RQa6Gm37zt+5jsmDEDKCyyxBNPPKhu3xdb5pic53bdtVd4t9sTcE8/9bCqr1/rHSYNW95c1tbS/GFDh6hNv7rIm3/H7Zud+Zq9TbLMDMD2xJ/cj4BDoQi4dCPggBSQN1j7TVeE7WFpCztmtM03XK2eeWZbYGzKlEnez+pVy51okulp0yZ7t9sScD87r7HF+bLHzF7eXHbAgOP85xI2f/y4sX4IilNOnuIsY7K3SV7YryGNgEOhCLh0I+CAhNl7T8LOV+ooO2ZMv/jFRi98Xnv1Ge/nvHmz/XkLFswLzKuoGOPPk4B75ZWnA+syA+q44/p705qMyR4yPb1u3Sr16r772xFn6tOnjz/vgft/54/r52EvLx+EMJ+Pyd4medHSayqJgJPzGL/fu0f99/uga35zlbNsFP7w4vPq4YcfcMY7qqX12r+XyV42TiedNMl7jvZ41Ai4dCPggATY0dbePWttZceMTT5lOnnyJO/TpPY8MenECc5Ye40bV+GMmWTPXJ8+vZ3xlsieun79+jrjNnub5F0SASchIwE3cuQIf0w+bCLj//zH+87yHSXr/ejDfzrjHdXSemV8zepqZzxpc+fOTiQaCbh0I+CAmEikJRltJr4Lle9CtcUdcKctXNBiVPz+rju9eT179giMNzc1qs03XKemTZvq3EfWJz/lsjHnbzxPLVu6xJmv937J7SFDBgfmn3zyNNXU1LDvMbs76xZz5sxSN954g7fe7t27tbhe/TzEgQJOlh006PgDjstj33TTZu/3D1tW3162bImaNnWKM//KKy8PfX5RI+DSjYADImbubQs7lJUUO2ryxN4WiD/g9n73jRpXOdYZb8mOHR97ESL3k5+7vv4iMF/HkrnM9kceDsw3rVy53J/3ze6vA/MWLz4rsG4JJ2+9e7/1lznttIWh6xX2czLXZT/nf3zwXmBMDnea6/huz25vevfur/z1T506ObCO4/f9Z897fiHbxn5u5rqjRsClGwEHRMDe22bPL4a87oVj71u4uAOukJC4796tgeVlL5lMv/HGq4H1ffLvDwP3sx9Dpu1DnfOq5gaWu+qqKwLTZWV9nPV88P67gbGw9erxO+/Y4h3CNOn5OgzN+3z4rw+8WJXbcqqAPf+tN99wHvuzT3f403I4WsZkr50e4xAqBAEHdIAZbsXc29YSO25K3eGHH+5sA+yXpoCTZSXizLHLL9vkhEx5+SjnfpWVFYHpsNAyyTd5mOt99NFtB3yuLa1XxsPYy5x55hmB6UmTTvRub3v4QbVu3ZrQ9Zq35ZCzPf/ee+/2pwk4CAIOaCcdbge6Jluxde7c2QmdUsSet9alLeDOOOO0wNjYsRVOyITdr7KyIjAdFlpy/ps+/GhHlhw2lQ9a2PexHydsvTLe2iFU8e+PP/QPecqh28BjW88p7PnJbTl3z35cAg42Ag4oQJr3trXFoYce6v2DXCrk97F/R4SLO+Ae2faQs1dNO+GEMerZZ57yz5GT+LjiissCy8ieKTtk7PXIWGVlRWDaDq1vv9nlnWemp+0PV7z//t9D120KW68eP1DA6eX0z7PP/uH8u3f//o469dR5zvL2fQk4tAUBB7SB/mBCVsMNiDvghETFT1aucMb1teH09Ndf7XQCRJ/cb67LXo8dcDt3fursTZNlHn9suz/9lz//MbAu+xw5IcFkXuYkbL163W0JOInIoUOHOI8zffrJgfPbhHwy13xsuU9DQ11gGTvg7A9GxIWASzcCDjiANH0wAWivJALuueee8cJC4kfO45I9cnu+3eWNmdeGk2jRobVq1U/Ul1987k3L+Wp6mbBAsQNOwkvG5HIg+mLBb7z+qjdWXX2uev21Vzwy/cD99/r3k8eTkJJPrt5zz93efPkwgb3e9959x1vv6NH7z8WTsd27vlQvv/SiY/Lkk/z7yzlwsuwf/+/N0N9BPpyxYsUy/7w/83eV2wcKOD326isvxXaRZEHApRsBB7SAvW4oJUkEnBgxfJja8clHfphILNnLCLm+m15Gzhvr2/fYwHwzasyxysqKwFhNzVongiSoZPqJxx/1puVab+ZhVfH5Zzu8ZSQ2N2261HksWe/HH/3LW2b27Fn+47ekqmpO4P4yFnZNOLkI9Ycf/sO/n3ywwb5fWwLumGPK/PC1HyMqBFy6EXCAxfxkqT0PyKqkAg6lg4BLNwIOMOi9bkl+awKQBAIOhSLg0o2AA370w143wg2lioBDoQi4dCPgkHvsdUMeEHAoFAGXbgQccotz3ZAnBBwKRcClGwGHXJJvT8jCtygAUSHgUCgCLt0IOOQSh0yRNwQcCkXApRsBh1zRh03tcaDUEXAoFAGXbgQccoOL8iLPCDgUioBLNwIOJU/vdeN8N+RZQwMBh8Js2LDeeR0hPQg4lDT9YQXOd0Pe1dXWOm/QQGuamhqd1xHSg4BDSSPegP1mzZqlpkyZ7LxJAy2p3Rf99usI6UHAoWTxYQUgqKmpyXmTBsL06NFdDRw40HkNIT0IOJQkPrCAvJLXvZw6ELbneebMmWrx4sXOmzVgW9/c7Lx+kC4EHEqK/losexzIC/3tIjY9v6yszPtAQ3n5KOdNG6iqmuudL2m/rpA+BBxKhv1GBeSJ7HHT/4ExtbQnet26dd5ellGjRnmHy+w3cuTHoEGD1Omnn6YaGxvV/PnzndcK0omAQ0lgzxvyyA42mTbH2nLpnAULFqi1a9eqmpoa5NRZZ52lRo4c6bw2kG4EHDKPeEOe6OsathZpMh52DhyA0kHAIfOIN+SBuWetpcOiAPKDgEOmEW8odebeNvaqAdAIOGQWeyJQyvQeN17jAMIQcMgc/fVY9jiQdeZhUnseAJgIOGSKPoGbQ0koNRwmBVAIAg6ZIm9wYZ+6A7JK71Em3AAUgoBDZhBvKDXsdQPQXgQcMkHCjZO5USr4gAKAjiLgkHr6vDd7HMgiPqQAIAoEHFKNT5yiVPBaBhAlAg6pxRseSgXnugGIGgGH1OIND6WAQ6YA4kDAIZX4xCmyTp+7yQcVAMSBgEPqsMcCpYD/hACIEwGH1CHekHUc/gcQNwIOqcGHFpB1+vpu9jgARI2AQ2pwyAlZxqF/AEki4JAKxBuyjHgDkDQCDkXHYSdkGfEGoBgIOBQV570hy4g3AMVCwKGoOHSKrOI7egEUEwGHouHND1nFnjcAxUbAoShkrxt73pBFnLMJIA0IOCSOQ0/IKuINQFoQcEgc570hi/jADYA0IeCQKM4dQhYRbwDShoBDYngTRFbJ65bvNgWQJgQcEsObILKIQ/4A0oiAQyLY84YsIt4ApBUBh9jxJogsktetfOrUHgeANCDgEDv2viFr+LANgLQj4BAr3gSRNcRbvLp27arKy8vVuHHj0IKhQ4eqgw8+2Nl2gImAQ2z41CmyhtdsfObOnasaGhpUbW2Nd/uUU05GCxYuXKjWr29W9fV1znYENAIOseGNEFnDazYe9fX1avbsWapbt6NQoMbGRjVixAhnmwIEHGLBGyGyhtdsPCTe7ChBYSZPnqxqamqcbYt8I+AQOT51iqzhNRuPpUuXqhNPnOgECQq3enU1e+IQQMAhUpxDhKzhQwvxaWpqckIE7VdXV+tsY+QXAYdI8UaILJHrvPGajcfo0aPVqafOdyIE7be+udnZzsgvAg6R4TAUsoS9xfFatGiRGjJksBMhaL9zzjlH9e3b19nWyCcCDpHhzRBZId/Jy+s1XitXrlRlZX2cCEH7yR7NYcOGOdsa+UTAIRK8GSJLeL3Gj4CLHgEHEwGHDuMkcGQJr9VkEHDRI+BgIuDQIZxHhCzhQwvJIeCiR8DBRMChQ/jgArKC/2wki4CLHgEHEwGHduPQKbJEXqvy4QV7HPEg4KJHwMFEwKFd2JuBLGFPcfIIuOgRcDARcCgY8YYsYc9bcRBw0SPgYCLgUDD2ZiAreK0WDwEXPQIOJgIOBWPvG7KAi/UWFwEXPQIOJgIOBeENEVnBa7W44g64/36/J2Dv3m/VPffc7SwzrnKsc9+sIuBgIuDQZpz7hqzgE9LFl1TAPf30E56//+1tP+TMZaIIOFmPPVYMBBxMBBzajJPBkQX8RyMdkgi4D95/NzBWVtbbG7/ggo3+MgQcShUBhzaRN0S5ir09DqQJ8ZY8vbfT/rBIMQJOjz/+2Hb/tgSc3jsn/vSnt5z7PPbYI/78l/7wgj8+dOgQf1wbMmSwP3/M6PLAvKlTJzvrjhIBBxMBhwPicBSygHgLkr3lJtk+NvlPWUfpfx9Msu6kA65nz+7qrTff8MaP3/f76mWEeb+9332jdu/6MrCed975iz/9wgvPemPdu3cLLGM//n33bg2My+PL9BtvvOosGxUCDiYCDq3iTRFZUMqfONXx1VowtZcdY+1hr1OvN4mAC7NgwfzAMvX1tYH7bd58vR9e5523ITTOZOzGG28ITIctIxFnjl1+2abQZaNCwMFEwKFV8o+xfWgESJusv04l0lqKITuM9N6ztJyPaj4/8zklEXBhh1DtZexz4H75y4v9yNJ728Lu9+GH/whMhy1zxhmnBcbGjq0IXTYqBBxMBBxapP9RtseBNMnS3rfWQk3HWVrCrK3kuYfFcxYC7qmnHg8NLhl7/72/BabDllmxYllgbNrUKaHLRoWAg4mAQ4uy8qaIfEvz6zQs2GQ6a5HWHlkIuJUrl4cGl4xdcskvAtNhyzzz9JOBsVtuvjF02agQcDARcAilD9PY40CapHEvsd4jmLdgs2Uh4PQyX32505+WQ6d2hO38/D9qxoxTAmMXX3xRYLlBgwZ603feeXtguSgRcDARcAdQVlamamtrVX19vWpoaMiF8zduVDfduNkZb7t6Vbdvm82cOdPZnkBUWjp0lyRirWVZCTixvrnJGxMSZvZ6hFwsWOabFwo++uie/v3+/fGHqm/fY537RYmAg4mAa4WEW11dnfOXCG0zZcoU1dTUpLp27epsW6Ajir3nzQw3iTZ7PuIPuDwi4GAi4EL06NFDNTY0qMGDBzl/gVC4pqZGNXDgQGc7A+1RzEvbmOezEW6tI+CiR8DBRMCFkMOA9l8cdExjY6Pq3Lmzs62BQkk8JX2YkmgrHAEXPQIOJgLOsmrVKlVRcYLzFwcdc9xx/b1D0vb2BgqR9Hlveo8b4VY4Ai56BBxMBJylubnJ+UuDaOzftt2cbQ60VVKHTs1DpfY8tA0BFz0CDiYCzjB//nw1enS585cG0ZB/zKurq53tDhxIUue9EW3RIeCiR8DBRMAZ1qxZo3r06O78pUF05PIi9nYHDiTuQ6d6j1vS59aVMgIuegQcTAScoaamxvkLg2gRcChUnPHGodL4EHDRI+BgIuAMBFz8CDgUQgeWPd5R5nXc2OsWDwIuegQcTAScgYCLHwGHtorrvDe93rj26mG/5cuXx/7NBHlz2mkL1ZAhQ5xtjXwi4AwEXPwIuOiUl5ercePGlay77rxNLVy4wBnvCFnn7VtudrYlojdjxgw1YcJ4598AtF9NzTrVpUsXZ1sjnwg4AwEXPwKuY2pra7zvmh0yZLCzbdF28i0r9fV1XJswZvJVeva2R/vV1fF6xQ8IOAMBFz8Crn2OOuoo7+vdhg4d4mxTtJ+EnGzX7t27O9scHbd06VJ14okTne2Owq1eXa1GjBjhbGPkFwFnIODiR8C1j+x14xI38ZGvz7O3OaJRX1/vbG8UZvLkyd77k71tkW8EnIGAix8BV7gVK1ao8ePHOdsS0Rk7tkKde+65zrZHxx155JHeBbztbY62mTNnNof6EYqAMxBw8SPgCsd5RMmQr3qztz2iMWbMGNXY2KDmzp3jbHeEk0uwLFu2VC1atMjZnoAg4AwEXPwIuMKMHTtWVVXNdbYjojd79ixn+yNakyZN8vYmyWFVOWyNcLJ91q5dq4YOHepsQ0Aj4AzFCrj/fr/HGWvLvCwi4AqzePFiNXDg8c52RPSOO66/s/0BIK0IOAMBFz8CrjBy7tDRR/d0tiOi1717N2f7A0BaEXCGrATctGlTVXNTo+rTp7czT8i8zZuvV7NmzQyM9+/fV522cIF/+7fXXO3cN24EXGEIuOQQcACyhIAzZCHg9n73jTem1dUGn7Me//abXd7PPd/u8udNn36yN7Zs6RJ/Ofvx4kbAFYaASw4BByBLCDhD2gPuJytXBKbvueduZ/qtN99w7v/m/77u3dYB19rjxY2AKwwBlxwCDkCWEHCGtAfcmtXV3nRLXxAdtp5bb7nJH9cBN2LEcGe5pCQVcAcddJA69NBDVadOnWJxyCGHOI8ZBwIuOQQcgCwh4AxpDzixe9eX/l60LVtudZZticzXAWc/RpLiDjiJqyOOOCIxnTt3dp5DlAi45BBwALKEgDMUM+BOOmmSM67n2WPa9df9NjC/tWVFKQec7G2z4ypJcYUcAZccAg5AlhBwhmIF3M/O+6n6bs9uZ/xPf3pLPfjg/f7093v3qHfe+UtgGQmyKVNO8m7v3PmpWrrknMD8TZsuVf/8x/ve7VINODlcagdVMUhE2s+towi45BBwALKEgDMUK+CEPtT5xhuvqkcf3RY49KnJJ05l7Oqrr1TnnbdBffXlzsAy8mXnMr19+zY1Z84sfz0337TZm1+qAWeHVDHZz62jCLjkEHAAsoSAMxQz4OS6bLJ3TYfbjk8+UmPGjHaWkzDT4fbiC88586urz/XXIctVVf3w3YMEXPyi3gtHwCWHgAOQJQScoZgBlxelHnCHH3648/w6Iu6AGzu2Qn3w/rvOuCafeJbo78gnl6NYRxIIOABZQsAZCLj4JRlwq1ev3Pem3N27fdHPz1Ovv/ass4yta9eu3qFoe7wQ9vPriKwF3PPPP+Ps5S10HcVCwAHIEgLOQMDFr1gB11br1p7bptBrjf382uLyX1+iZkw/2RkvdsAJ/fVrmoTO6tWr9kXxhap//36B5fThe7lt3s9eh54+5ZST1bXXXqMGDRroPK5YtmyJuu22W7yvhtPrLCsL/wq5jiLgAGQJAWcg4OJXrICT22aYXXrphd60uPDCn/rjekw88/Q2f/zR7ff645WVFc5jmezn1xYScJoZcmkIOHuPmo407Y7bbwsdN+8Xtg59YWpt+yMPB5bZ9fUX3vhnn+4ILFdePsp5jlEg4ABkCQFnIODid9utN6s11SsjZQeU1lrAyW0JIzm8J7fnz5/rjetDrbJnqV+/vt5Yly5d1F2/u9m7PWFC5QH30NnPry3MgDOlLeCGDRuqHnroh0vb1NfVBuaHHUK116GnP/n3h/60XO7GXOa+e7eG3sdeb5QIOABZQsAZCLj4pSXg7tm6xb997LHHqEEDj/duhx1CnTr1JDVn9gx/eujQwapXr6Odx9Ps59cWdrilNeBGjRqpPv7oX84yWiEBZ+9Jk7HKygr/9uef7XDm2+uNEgEHIEsIOAMBF7+0HELVh0NvueXafRFzgj8eFnDm8pdcfL465pgyZ77Jfn5tYUabBJ0eT1vA6WntkW0PeeGj5xUScGHLVFZWeLdfe/VlZxl7OmoEHIAsIeAMBFz80hJwYtjQIWrTry7yxu+4fbM31lLAiVNOnqK2bLnBmy+37fma/fzaQsJt4PEDnPE0BpwYM7pcbb37Lj/k9HhUAScxJdPffrNL3XTTZrX3u29C7xMlAg5AlhBwBgIufmkIuBEjhqna2tX+covOWODPmzdvthNwl192ierTp48/vW3bVvWLX2x0Hk+zn19HpC3g3v37O2r0aPfQ58afnefdlj1yYaFlj9nTeqyyssK/vXz5UmeZOBFwALKEgDMQcPFLQ8AJfUhUGzlyeOg8mT7yyCO926+8/JT387V9ZMx+PM1+fh2RRMBJLL380osOvYwZWxMmjFd7936rzjnnbLV2zWrvfDhz/sSJ471p+eToNb+5Sp166jxnHWHTeqyyssK/Ld/hK2GoLVgw37lPlAg4AFlCwBkIuPglGXAHMmDAcf4nTduisrJCHXXUUc64KYvfxCCxFEYvY8fWww8/4C/z5v++7qxz3rwq9fbbf/bm//KXF4euw57WY5WVFd7tGTNOcZ6PCPv6uKgQcACyhIAzpCHgnnzy8dA3t1KRpoCLA9+FGg35OxB2wd44/24QcACyhIAzEHDxK/WAs59bR+U54Oyx1sajQMAByBICzkDAxS+OgDvooIOckCqGqPe+iTwH3Ndf7VQ3XH+tuuyyTeqerb9X3+/94Vsf4kDAAcgSAs4Qd8DJd0fKT/u8nrfefMNfRgfcRx/+M7DMiOHDAuvS43u+3eXftufrryrSl2Cwv6po2rSpgflCTky3n3eU4gg4zQ6qJNnPJSp5DbhiIOAAZAkBZ0gi4P74xze9E7T12IoVywLxpQNOxvWYBNbuXV/60w0NdYFpIff54ovPAtOtfVWRXsY8z2jLlludZaIWZ8CJTp06OXEVp86dOzvPIUoEXHIIOABZQsAZkgi4nZ//xxmXaJJPRMrtsEOomzdfHxiz5wu5XIO9TGtfVfTTn64PXY+MySErezwqcQecJodV5ZCmBF0cDjnkEOcx40DAJYeAA5AlBJwhiYCTc3rs8ccee0StXLncux0WcHIpBjvO7HXY42HLmAH3wgvPetNh4rxUQ1IBVyoIuOQQcACyhIAzJBFwd96xxRmXYFqyZLF3u70Bp796qLVlzIDTj9OnT2+HfFG7fd+oEHCFIeCSQ8AByBICzpBEwLUUVjqa2hJwciX83r17BZaxz6Wz16HHKisrvNvLli4JXSZuBFxhCLjkEHAAsoSAMyQVcM1Njf7YtddeEwiptgTc7NmzAtM9enT3puXq93rMXoceq6ysCExPnTrZnz777LO8seHDhzr3jQoBV5hzzz3X2ytqb0dET0LZ3v4AkFYEnCGJgJNPkI4fP84LJTu6RFsCTpx55hn+OuQTqWFfMG4/vh1wQr4KSa/n5Zd/+P7LuBBwhRk7dqyqqprrbEdET/5jZG9/dExZWZlavny5qq+v3/dvXwPaSf7dnD9/fmIfnkI2EHCGpALOHs8TAq5wTU1NznZE9Jqbm5xtj/ar3fd3va6uVg0aNNDZ1ijcuHGVan1zszrnnHOcbY18IuAMBFz8CLjCrVixwttra29LRGfs2ArvcLW97VG4Hj16qMaGBsItJtOnn8K/o/AQcAYCLn78w9M+DQ313rmO9vZENOQwlb3N0T6yLe3ti2jJf+jk/cre9sgXAs4Qd8DJpUIWLjzVGc8TAq59jjrqKG+vxtChQ5xtivYbPHiQt127d+/ubHMUTj41XVFxgrOdEb3ly5c52x/5QsAZ4g44EHAdVVtb4+2NGzJksLNt0XYSbvX1dd55WvY2RvvJeYT2tkZ8hg8f7vwZID8IOAMBFz8CLjrl5eVq3LhxJeuuO29TCxcucMY7QtZ5+5abnW2JaNhf34d48e9pvhFwBgIufvyDg7aaMf1kdfmvL3HGO0qvV37a89AxnKeZLNkbb/8ZID8IOAMBFz8CDoVYU70y1oiLY915ddBBBzl/3xEvPnyTbwScgYCLHwGHQklkScjZ41Eg5KJDwCWPgMs3As6wZs0aDgHEjIBDe0hgDTx+gDMeFSKu4wi45BFw+UbAGeSrSkaPLnf+kiAaZWV9vMsM2NsdOJC4zoezEXLtR8Alj4DLNwLOwsfg47N/23ZztjnQFrIHLqm40iGX1OOVAgIueQRcvhFwllWrVnEhyhgcd1x/rrmFDpOgSvLTo3xite0IuOQRcPlGwIXgq2Ci19TUqDp37uxsa6AQei9cnOfDhWGP3IERcMkj4PKNgAuhv4xZrtZu/4VB4ZqamtTAgQOd7Qy0R1Lnw4UxQ469ckEEXPIIuHwj4Fohh/zq6vL95fMdMWXKFC/eunbt6mxboCOKvTfMvPwIIbcfAZc8Ai7fCLgDKCsr80Kuvr7e+8uSB+dv3KhuunGzM9529d7lQmbOnOlsTyAqaYgnM+TS8HyKiYBLnvx7a/85ID8IOISSC6cmfZ4RUCiJprgu8tteeY26uANu7NgK9d/v94Tq1etoZ/li+sOLzztjcSDg8o2AQ4uKeYgKaKs0v07tmNNBV4r/OUoi4D54/11nvLGx3os4e7yYkno+BFy+EXBoURr3bgA2iaGsvE7Dgk7/PctS2IXtVSxWwImwYFqyZLG67LJN3iWM7HmnLVzg/Rw1aqTafMN1at26Nc4y2vnn/0z95uornfH+/fv666mpWavuuutOf93yfOSnGDJksHPfqBBw+UbAoVXy5pKVNxXkV5YPVcrzloCzo84OPDPyiv13Uj8vc5unJeB69uzhHGJ99ZWXnOW3P/Kw9/O7Pbv95Xr2/OGrFOvrap31VFZW+POn7/vd7fvrdZtWrlzuPN+oEHD5RsChVXqPgT0OpEmS39KQJPm9dOAdKPIKodfXXvb6RBIBJ0E0adKJvhkzTlH/99b/qj3f7vKXk9s6psTEieO96bPOXOSPyfQ/PngvsH4Z+/qrnd7tsrLe3vQ9W3/vz9/xyUeB9eqAk7185nr0uuyxOBBw+UbA4YD0P/j2OJAm/GdjP72HTsdfGDvICmXHmxg48HgnMKLU2ocY9DJ679sY6zutZeyb3V8Hpu31L11yjj/+yLaHQpeRsWVLl3i3dcDZy7S0/jgQcPlGwKFNvH+gi3zYBjgQHRP2OKKlt7PEnB5LYg+ceQhVB5QZa1VVc5y4Cwu9sMDq3r2bP75377fq+73uMjJ/6913BR7fXqal9ceBgMs3Ag5tRsQhC/QeInsc8Uo64MSlv7w4EEvDhw/1pvv06e3c3xQWWJMnn+SPv//e30KXkbFNmy71bhNwKDYCDm3GISpkhb13CPErRsAJiaXy8lGB6ddefTmwzF//8if1t3f+GlhGPjlqLrNjx8d+eM2ZM8u7LY+p519wwUZvTPbUyXRrAbdz56deTNrjUSPg8o2AQ0EIOGQFr9VkFSvgpk6dHAipU0+d502//faf1fLlS72fMj1ixHB/GZkWzzz9pHdOm443fVkQIREmY3J5kJ/+dL13e/v2bf781gKuqanBm3fjjTeoa35zlTM/KgRcvhFwKBhvjMiCUv1kaloVK+CExNLFF1/kT8t5cfKJUhl///2/q7KyPs7y8vOP//emH3MSZPZ6r776Sn9+dfW5gXmtBZx48IH7/Pva86JCwOUbAYeCyZtiVq+5hXzhtZqcuAMuSnFGVZIIuHwj4FAw9mwgK/RrlQ/fxI+ASx4Bl28EHNqFiEOWsCcufgRc8gi4fCPg0G76WlD2OJA27ImLX5YCrlQQcPlGwKFDeFNEVnAZnHgRcMkj4PKNgEOHcCgVWcJe4/gQcMkj4PKNgEOH8aaILOG1Gg8CLnkEXL4RcIgEb4rIEl6v0SPgkkfA5RsBh8jwpois4Hy46BFwySPg8o2AQ2S4VAOyhC+9j17fvsc6kYH41NfXO38GyA8CDpHhAw3IGs7fjNbMmTOcyEB81q1b5/wZID8IOESKvRrIGvYcR6e5ucmJDMRn+PDhzp8B8oOAQ+TkDVFCzh4H0kpes1zPsOOqq6tVRcUJTmggesuXL3O2P/KFgEMs2AuHLOFDDdGRE+vt2EC0xo8fp2pqapxtj3wh4BAb9moga4i4aCxatEht2LBe9ejR3YkPtN/IkSNUU1OTGjNmjLPNkT8EHGLDXg1kDR9qiE7fvn1VbW2tWt/crObOnaNOOeVktIN8MGTFihVeuK1atcrZzsgvAg6x4s0QWcM5nNErLy9X48aNQztUVFSosrIyZ5sCBBxiR8Qha/hkKoC0I+AQO94MkTX6moacwwkgrQg4xI4L/CKLOIcTQJoRcEgEb4bIIi5MDSCtCDgkhohDFrEHGUAaEXBIFJdpQBbxyVQAaUPAIXF8qAFZxOsWQJoQcEgch6SQVUQcgLQg4FAUcjiKN0JkDZcXAZAWBByKhr1wyCL9YRwiDkAxEXAoKt4IkVX8BwRAMRFwKCouLYIs47ULoFgIOBQdF0tFVvHaBVAsBBxSgetsIauIOADFQMAhNTgfDllFxAFIGgGH1OD6cMgyee3y+gWQFAIOqcObILKM0wEAJIGAQ+qwJwNZx+sXQNwIOKSSvAHyTQ3IMs7pBBAnAg6pxRsgskxf45D/iACIAwGH1OIiv8g6/cEczokDEDUCDqnG5RlQCjivE0DUCDikHpcXQangkCqAqBBwyAR50+MwFEoBh1QBRIGAQ2aw9wKlQh9S5fUMoL0IOGQKb3ooFfpDOpweAKA9CDhkij4fjsuLoFQQcQDag4BD5ug9F0QcSgkhB6AQBBwyiWvEoRTpy+bwHxQAB0LAIdOIOJQq8xw5+7zPsDEA+ULAIfOIOJQyM+TC2MsDyAcCDpnHtzUgT+yA47UP5BMBh5JAxCEv7Hi75urL1H33/l6dv3GjqqmpARK1bNkyNWHCBOd1ivgRcCgZ7I1AqdPfSCI/u3Xrpupqa9X69evViSdOVL1799o3dhSQqH79+qpZs2aq5uYmVV5e7rxmER8CDiWFPXHIC3nDJNqQJjU169TixYud1yriQcChJEnE8X2TKEXdu3f34s1+8wTS4Oije6r6+nrndYvoEXAoWeyJQymSw6a9eh3tvHECaTFjxnQ1b94857WLaBFwKGkScVwQFaWiS5cuqrm52XnDBNKmsaHBef0iWgQcSpq+hhYXPUUpmDFjhpo4cYLzZgmkTW1tjeratavzGkZ0CDiUPCIOpaK6uprDp8iEqqq5atSoUc5rGNEh4JAbXGYEWSfX3bLfKIE0mj79FDV27FjnNYzoEHDIFb03zh4HsoCAQ1YQcPEj4JBLfLgBWUTAISsIuPgRcMglzotDFhFwyAoCLn4EHHJL9sBxXhyyhIBDVhBw8SPgkHs64tgbh7Qj4JAVBFz8CDjgRz8cUuW8OKQZAYesIODiR8ABBvn+VPbGIa0IOGQFARc/Ag6w6L1xnBuHtCHgkBUEXPwIOKAFOuRkr5w9DyiGuAOurKyPxx63yTLdu3dzxgv13+/3qP79+zrjSejb91jv8UeMGO7Mi8oJJ4xRS5ec44x3lDzv6upznfE0IeDiR8ABB8DeOKRF3AEnYSCefOIxZ5724AP3ectMmnSiM69QSQXcH158Xj388AOBsSQCbu/eb73HmDp1sjOvLW64/lo1YvgwZ5yAgyDggDbgunFIg6QCTtjz7GWyFHDyOB99+M/AmHyn7C9+8XPVr188jy/rl8fdseNjtevrL5z5bfH888+oiooTnHF53hMnjnfG04SAix8BBxSAS46gmJIIuG0PP+j9rK1d58xfuXJ5qwF3xeW/Vhf9/ELVo0d3Z54488wz1K233KTmzJnlP15YwN1002bV3NTojJ+2cIF/e+PPzlPXXfdbf/rkk6epzZuvV5Mnn+TcRz9nuW2uw7ytVVXN8R6/vr7WmSfLDxhwnHd74cJT1WWXbXKW0WSv3+7dX6lxlWNbDWLZFjfeeIN3uNV+LLnfhvVN3u3x48cF5tnbbdy4SnXttdeo887b4DzGggXzvfUffXRPdf7G89SypUucZaJGwMWPgAPaoRRC7uCDD1adOnXKHHne9u+SF0kEnBxq/PqrnaHRIWPvvfuOE3CDBw/yI0mTmDPv++03u7zx7/funy97xOyAq6lZ641J+Oj1mIcfZVriUM/78F8feOPf7P7am/7yi8+9n3u+3RW4j82cZz7H+rpab+y7Pbv9ZSsrKwLLz58/r8X1mWR87tzZ/u3777vHWWbvd9948/Sh1s8+3RG4v0nC15w3fd+/PXpa9vLJmN629h4/2T6//vWv9j/W/39MIXsJ7ecUFQIufgQc0AHmJ1azEHOHHXaYOuKII0qGBJ39O5aypAJO3zbnyZ4dPSY/zYCT6XXr1vjTOrIuvvgif/7uXV8G1ldW1tsb1wG3fPlSJyqGDx/qjfXs2cNfj/28xK233hyYlmVuvmlzYNo+hKrH9e0VK5Y5655XNdcbk+eql7eXkekXXnjWWbcZkVOmnOQtZ+6ZlOm3//qnwH3k99iwodmfbukQqtxXB5zEnx1sH3/0r8Dz1IFrLiP3k1C21x0VAi5+BBwQER1yaf3Agx0/paJz587O71qqkgw4iQDzE5Qy79VXXvJv64DTe63C1qXH5aectxW2jA44vUfuV5deEiBj+nCm3P79XXc66xESWY2N9ep3v7tjfxy9/efA4xwo4OzoMZe5+uor/duff/bDXjIhIfTvjz8MjMlzPP3005z1PPH4o4HpmTOnO49nakvAedv2ogsD85ctWxL4XcIC7rlnn3bGokTAxY+AAyKW1r1ydviUEvt3LVVJBtywYfv3fsnt8vJR3u3evXv5y+mAu/6634aGwBtvvOqPm8vbj6cDTm63RM7t0ss0NTWErkfTIVZowMntnZ//J3SZxx57xL8thyvN+WEBZz9/k8zv379f4LFb0taAm3TixMD8Y44pC6yfgCtNBBwQEzPkih1zdvCUmrzshUsy4PS0XG7jP//5t3fulDmug0wuZxEWAjKm7yO3r7rqitBldMC9+/f959bZy9jL2wEnh1zlnDV7uUID7v33/hb6+DK2adOl/u0DBZz+8MGY0eVBY0YH1i+3wz5EYWprwF1xxWWB+XI423wsAq40EXBAAoodc3bwlCL7dy5FxQi4v/7lT97PU0+dFxi3z4EzT7I//vgB3pg+L07OB7NjQaJGxnTASZDItPlpTDn37Z//eN87F00/TkNDXWA9ixadrh5/bLs/rfc+mQG3c+en3gn+5v30+vRt+TSo/RwvuGCjN6YvWiy3zccSdsBJtO745CPnsYR8kENf/kPWJR+6MOfL7yqfSNXTj2x7SP1k5QpnPXJfHXBhHzjRH8LQ0xJwduQScNlHwAEJs2Mu7m96OPTQQ53YKUUHHXSQ87uXmqQDTi7LIWP2G71MmwEnl/OQMTkX65abb/Rumyfx64vmSsCsb27yzhHT6zU/hSrhI2PygYLLL9vkPLbctgNOj8ueQHl8uS0xad5P9trJtHyC9prfXKVGjx7l389cj4Tep//5xLvMxnPPPePN3759W+Bx7rt3a+A+ZsDJZTpkmcrKCuc5Crn0yBdffObdlucgy8onT+XyLPK49vOR2JMxOa9Pnrf5PHTASeTKtERaXW2NeuD+e71pOUyrl5d5n/x7/3PUCLjsI+CAFLCjLso9dT/+8Y+d2InDgw/epZ584kFnPCmHHHKI87tnVUt//nEHXEfNnj3LuQ6bSUJu8eKz/E91tkRCZ8iQwc54a+T6bVF8q0KfPr3VWWedqUaNGunMi4OcVyjXx7PHCyWfcJXtJteds+cVAwEXPwIOSKGBxw9oMepkj539xt6apAKu2Eox4OyQS3vAARoBFz8CDsgQeSOXgLPf4MMCTyJQtBZwr7/2rJo4YZx6bd/PTZsu8sfPP3+9N0+ccMLowPJh65D//W++4Wp1xx03BuZtvfs2b/7zz21XRx55pDcme2HM9VRVzXbWa05feumF/nPp2rWr8/haVgJO/7noSNd/pgf6cxUEHLKCgIsfAQeUCB0EdghMGF/pxI4ZSq+8/JSqmjvLO3QkYxs3NvsBNW3aZO+2RJdMP/vMI4H7n3TSRH9ZO+CeeXqbuvfe273bF1ywIRBlcrtLly7+cjK9ePEif/5rrz7j/Vy29GxvnpxbZIefbdbM6X4IHYgdRsWmn5cOb/s5ypj8GRNwyAoCLn4EHFDiDrQHLmzM3NP1q0t/rl76w5Pe7crKCrXojAX+vOee3a5Wr17p3TYDzgw7c72NDeu826++8rRatmyxP75ixRL18kv7H0OsW3uu9/P2LTeoe7Zu8ceHDh0cWKepkIDTe74KYe45C2Nv947QASc/zXECDllBwMWPgANKXCEBJyeBy1gYvYzeO2bf3wy4Ky6/xLm/eOjB33vz6+vWqKeeekgNHjzQizlzXdOnT/MPt8on6fR9b7nlWn88TFYOobaFBKM9Jgg4ZAUBFz8CDihxhQScnMtmj9lkvlyl/8bNv1EX/fw8f9wMuPr6tW1ajxy+lXXJtATd+uY673w8e1nzPgMGHOeMi1IKuJYQcMgKAi5+BBxQ4goJOCEBdf31V/rTd/3uZu9QqZ6+8IIN6uGHfu/c1z4HTubLoVRzuqamOjBtrmPO7BnOmNyurV0dmCbg3DdLIG0IuPgRcECJKzTg9Lick6aDSj5EYM83D6UKO+AGDTzeW+4PLz7u/XzqyYcCy1911a8CYajX+/xzj/rTo0aN8J+DkGvNmcubCDggPQi4+BFwQIlr7zcxTJq0/wuy7fFCTZ58ojMm5HBtWVmfwNiwoUO8r0Kyl5W9bv369XXGTXwTA5AeBFz8CDggB+zYKUX271yKqqurvS9vt98sgbSpqpqrRo0a5byGER0CDsgBO3ZKTefOnZ3fuRTNmDFDTZw4wXmzBNKmtrbGuxyR/RpGdAg4ICfs6Ckl9u9ayhobG503SyBN5JzZ2tpa57WLaBFwQE7ISf52+JSCPJz7ZqqqqlLz5lU5b5pAWqxfv14dc8wxzmsX0SLggJw5/PDDnQjKosMOO8z53fKirrbWedME0uDss89Sp59+uvOaRfQIOCCnDj74YNWpU6fMkedt/y551NzcpHr37uW8gQLFUlOzTi1evNh5rSIeBBwAZFC3bt28PXFyuOrEEycScygKubzPrFkzvf9QlJeXO69TxIeAA4AMk++HnT59ulq1apV3nTggScuWLVMTJkxwXpeIHwEHAACQMQQcAABAxhBwAAAAGUPAAQAAZAwBBwAAkDEEHAAAQMYQcAAAABlDwAEAAGQMAQcAAJAxBBwAAEDGEHAAAAAZQ8ABAABkDAEHAACQMf8P4l2RhDas110AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,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>