# EventHub Playwright Automation

Playwright UI and REST API automation for EventHub event booking. The project keeps authentication in shared fixtures, separates API clients from UI page objects, and tracks created bookings for teardown cleanup.

## Requirements

- Node.js 20+
- npm
- A dedicated EventHub test account

The target app and API default to:

- Web: `https://eventhub.rahulshettyacademy.com`
- API: `https://api.eventhub.rahulshettyacademy.com/api`

Override them in `.env` when using a non-production environment. Copy `.env.example` to `.env`, then set the account credentials. Do not commit `.env`.

## Credentials for a registered user

- Username: dalia@example.com
- Password: MyPassword123!

## First-time setup

```powershell
npm ci
Copy-Item .env.example .env
npx playwright install chromium
```

Edit `.env` and set `EVENTHUB_EMAIL` and `EVENTHUB_PASSWORD` to a dedicated test account. The `APP_BASE_URL` and `API_BASE_URL` defaults target the hosted EventHub environment; change them only when using another environment.

Create a dedicated account through the app's Register page, or explicitly invoke `npm run account:register` after setting credentials in `.env`. Account registration is opt-in because the public API has no account-deletion endpoint. The app requires a password of at least eight characters with uppercase, number, and special character.

Each account has an isolated EventHub sandbox. Booking tests authenticate through the shared `api` and `authenticatedPage` fixtures, keeping token handling out of those test cases. The fixture obtains a bearer token using `/auth/login`, while the browser logs in through the UI. Auth specs cover API and UI login; UI signup specs cover validation.

## Running tests

Run commands from the project root:

```powershell
# Run the full suite
npm test

# Run only the UI or API tests
npm run test:ui
npm run test:api

# Run with a visible browser
npm run test:headed

# Check TypeScript types
npm run typecheck

# Open the latest HTML report
npm run test:report
```

## Project layout

```text
.github/
  workflows/
    playwright.yml  GitHub Actions test workflow
src/
  api/          Typed API model and request wrapper
  config/       Environment and credential validation
  pages/        Login, booking, and My Bookings page objects
tests/
  api/          REST API auth, booking, and cancellation tests
  fixtures/     Shared auth, event selection, and cleanup fixtures
  ui/           Browser login, booking, and cancellation tests
tools/          Explicit, one-time test-account registration command
```

The full suite currently runs against Chromium. API tests use the configured test account and its event sandbox. To record a Playwright trace for API tests:

```powershell
npm run test:api -- --trace on
npx playwright show-trace "test-results\<test-folder>\trace.zip"
```

The trace file is created under `test-results` for each test.

## GitHub Actions

The Playwright workflow runs on every push and on pull requests targeting `main` or `master`. Add `EVENTHUB_EMAIL` and `EVENTHUB_PASSWORD` as repository Actions secrets so the workflow can authenticate with the dedicated test account.

## Story review

The EventHub booking story is covered through both the UI and REST API: a customer books available tickets, sees a confirmation and reference, and can find or cancel the booking. Inventory assertions check that booking reduces available seats and cancellation restores them. The sold-out UI test books the remaining 1–9 seats of a featured event and verifies the event is shown as sold out.

### Acceptance coverage

| Acceptance criterion | Coverage |
| --- | --- |
| AC1: confirm booking and show reference | UI booking confirmation; API create response and booking lookup |
| AC2: total is unit price × quantity | UI displayed total and booking record; API exact total assertion |
| AC3: booking appears in My Bookings | UI card assertion; API list assertion |
| AC4: cancel a booking | Dedicated UI and API cancellation specs |
| AC5: booking through `POST /api/bookings` | API positive and negative scenarios |
| Authentication | UI login and signup validation; API login |

Additional cases cover UI login and signup validation, invalid booking details, API quantities below and above the allowed range, invalid email, missing events, and unauthenticated protected-resource access. Successful account registration is deliberately not part of the automated suite because the service has no account-deletion endpoint.

### User Story Clarification

- Visitors cannot view or cancel bookings unless they are signed in. The story should therefore begin, “As an authenticated user…” rather than “As a visitor to EventHub.”

### Missing Requirements (Would ask the PO to Clarify)

- User data guidelines while booking.
- The error messages for invalid credentials are not specified.
- Maximum number of tickets per booking.
- Maximum number of tickets that a single user can book.
- What happens if an event is sold out during booking.
- What happens if ticket price got updated during booking.
- Time that a user can hold tickets after proceeding to payment.
- Payment requirements, details and methods are not mentioned.
- Should a confirmation mail, text message be sent to registered email & number.
- Confirmation mail & text message format (e.g., PDF with a QR code).
- The cancellation & refund policy.
- Cancellation deadline.
- What happens after booking cancellation and if canceled events should be added to a history page.
- How refund takes place (credit on account or back to original payment).
- Scenarios when error happens during booking, payment, cancellation (User messages, redirection). 
- Scenario for when an event is free.


## Findings

# System Limitations

- A country code is not required when entering a phone number.
- Event having a ticket tier (e.g., Early Bird, General Admission, VIP)
- Show Password Icon: The password fields does not provide a Show/Hide Password icon, making it difficult for users to verify their entered password.

# System Bugs

- Phone number validation does not enforce a maximum length.
- Booking got cancelled successfully although booking showed non-eligibility for refund showing to user "Not eligible for refund. Group bookings(3 tickets) are non-refundable."
- Number of seats available update is intermittent after cancellation

# UI Bugs

- Booking ID Display: The booking ID number is displayed in the user interface.
- Validation Error Message: While booking, password validation failure message is displayed to the user.
- Ticket Price Alignment: The price per ticket in booking page is not properly aligned in the user interface.
- Incorrect Pluralization: During cancellation, The word "seat(s)" is not dynamic based on number of tickets.
- Booking Status After Cancellation: The booking status is initially displayed as "Confirmed". However, after cancellation, the booking disappears completely instead of remaining visible with an updated cancellation status or moving to a History page.
- Login Validation Error Message: An "Invalid email or Password" message is displayed when the login credentials are incorrect instead of showing user message.

# API Functional Issues

- Available Seats Not Updated: After successfully booking 10 tickets, the available seat count remains unchanged at 200 instead of decreasing to 190. The API does not appear to update the available seats displayed with booking confirmation.

# Mismatch between Web and API

- Password Validation Rules: When siging up, there is an inconsistency between the Web application and the API regarding password validation. 
The web application has a list of guidelines for password; "At least 8 characters, One uppercase letter, One number, One special character", where the API has only one guideline which is; "At least 6 characters" which is actually contradicting to one of the web application guidelines.

- Phone Number Validation Rules: When booking, there is an inconsistency between the Web application and the API regarding phone number validation. The API only accepts digits and the following characters: +, -, spaces, and parentheses. However, the Web application doesn't display clear validation guidance & show validation failure error to user when user confirm booking instead.

- Booking Confirmation: The Web application and API display different booking confirmation messages.

- Booking Cancellation: The cancellation confirmation messages differ between the Web application and the API.

- Confirm Password Validation: The API does not cover the Confirm Password field or validate whether the password and confirmation password match. The API currently accepts only an email and a password.



## Key decisions

- **Authentication belongs to fixtures:** the shared `api` fixture logs in and attaches the bearer token; `authenticatedPage` handles UI login. Individual protected tests use these fixtures instead of managing authorization.
- **Keep UI and API coverage separate:** UI specs validate user-visible behavior; API specs validate request outcomes and data. Shared API and page-object helpers keep the test cases focused.
- **Use isolated test data and clean up bookings:** booking tests generate distinct customer details and register created booking IDs with teardown cleanup. Cancellation tests remove successfully cancelled bookings from that cleanup tracker.
- **Choose available inventory dynamically:** booking tests select an available featured event and a valid quantity; the sold-out test requires a featured event with 1–9 seats available.
- **Keep persistent account creation opt-in:** create the dedicated test account manually or through the one-time registration script, rather than creating permanent accounts in the normal test suite.


## What I would do with more time

- Expand UI and API coverage for edge cases, guidelines & validation messages.
- Purchase Limits: The system must enforce maximum ticket limits per transaction to prevent scalping.
-	Free Events: If the ticket price is $0, the checkout flow should skip the payment gateway step and issue the confirmation immediately after collecting attendee details.
- Adding a ticket tier to an event (e.g., General Admission, VIP).
- Add ticket reservation to handle concurrent bookings.
- Add ticket reservation timeout where selected tickets should be held in a temporary cart for a set window (such as 10 minutes) with a visible countdown timer before returning to the public pool.
- Integrate payment processing and test successful, declined, and interrupted payment flows.
-	Payment Failure: If a card is declined or times out, the system must display a clear error message, retain my entered contact details, and allow me to retry without losing my cart hold.
- Send booking confirmations by email and SMS, and test delivery and failure handling.
- Add Firefox and WebKit CI projects after confirming the app and environment support them.
- Validate API responses against explicit schemas and preserve traces and reports as CI artifacts to simplify troubleshooting.


## Data safety and cleanup

The suite creates bookings only in the authenticated test account and records their IDs immediately. Teardown cancels any booking left behind after a failed test. Successful UI/API cancellation tests also verify removal and remove that ID from the cleanup tracker. Do not use a personal account.

Account creation itself cannot be automatically undone: the service documents no account-delete endpoint. Keep a single dedicated test account instead of creating a new account for every run. The web app's “Clear all bookings” action is deliberately not used because it could delete pre-existing account data.
