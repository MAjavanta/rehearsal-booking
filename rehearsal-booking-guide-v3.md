# Rehearsal Space Booking System — Technical Guide v3
### ASP.NET Core Web API + React (Vite) — Walking Skeleton Approach

> Every major decision is made for you here. Your job is to follow the steps,
> understand what you're building, and not worry about anything outside the
> current milestone.

---

## 0. All Decisions Made Upfront

### Frontend: React with Vite

You know some React from Next.js experience. Vite gives you React without
framework magic on top — every HTTP call you write is one you understand.
Tailwind and shadcn/ui both work perfectly.

**Why not Blazor WASM?** The UI component ecosystem is different (no shadcn/ui
— you'd use MudBlazor), Tailwind setup is fiddly, and you'd be learning two
unfamiliar things at once. React is lower friction here.

**Why not Next.js?** The goal is learning the HTTP pipeline. Next.js has API
routes and server components that blur the line between frontend and backend.
Start with clean separation.

### Styling: Tailwind + shadcn/ui

Same mental model you may have seen in Next.js — utility classes on elements.
shadcn/ui is pre-built React components built on Tailwind. Both have excellent
documentation.

### Backend: ASP.NET Core Web API

Returns JSON only. Knows nothing about HTML. The frontend knows nothing about
how data is stored. They only communicate through HTTP.

### Database: SQLite locally, PostgreSQL in production

EF Core abstracts the difference. Start with SQLite — no installation needed.

---

## 1. The Walking Skeleton Approach — Why and How

You asked whether it makes sense to build some endpoints with in-memory data,
connect the frontend to them, then layer in the database afterwards. Yes —
this is not only sensible, it's a named pattern called a **walking skeleton**,
and it's one of the best ways to maintain momentum on a project like this.

The alternative — building all your backend endpoints properly with EF Core
before touching the frontend — means spending potentially weeks never seeing
anything in a browser. When you finally hook up the frontend and something
doesn't work, you don't know whether the problem is in your controller, your
service, your EF Core query, your React component, or your fetch call. You
have too many moving parts to isolate.

The walking skeleton gives you a different shape: at the end of Phase 1, your
entire user-facing flow works in a browser, backed by fake in-memory data. You
can click through the full booking journey. Then in Phase 2, you swap the fake
data out for a real database — and because the controllers and frontend don't
change, you immediately know that any new errors are in the database layer.

Concretely, your in-memory "database" for the first phase is just a static
list or dictionary declared at the top of your controller or service. Something
like:

```csharp
private static List<Room> _rooms = new()
{
    new Room { Id = 1, Name = "Room A", HourlyRate = 12 },
    new Room { Id = 2, Name = "Room B", HourlyRate = 15 },
};
```

When Phase 2 arrives, you delete this list and swap the references to it for
EF Core database calls. The rest of the code — including all your React
components — doesn't change at all. That's the point.

---

## 2. Controllers — A Proper Explanation

When React calls `GET /api/rooms`, ASP.NET Core needs to decide which bit of
code handles it. That decision is made by the **routing system**, which reads
the URL and HTTP method and maps them to a C# method.

A **controller** is a class that groups related endpoints. Each public method
is one endpoint. You decorate the class with attributes that define the URL
prefix, and each method with an attribute for the HTTP verb.

```csharp
[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    [HttpGet]           // handles GET /api/rooms
    public IActionResult GetAll() { ... }

    [HttpGet("{id}")]   // handles GET /api/rooms/42
    public IActionResult GetOne(int id) { ... }

    [HttpPost]          // handles POST /api/rooms
    public IActionResult Create(...) { ... }
}
```

`[Route("api/[controller]")]` means every method lives under `/api/rooms` —
`[controller]` is replaced automatically with the class name minus "Controller".

`[ApiController]` does three useful things: validates request bodies
automatically, reads JSON bodies automatically, and tidies up error responses.

### Thin controller, fat service

A controller method should be thin. Its job is:

1. Receive the incoming data
2. Hand it to a **service class** that does the real work
3. Wrap the result in an HTTP response and return it

The service is where your logic lives. You'll have a `BookingService` for
booking logic, an `AvailabilityService` for slot calculations, and so on.
The controller just calls them and wraps results.

Returning responses:
```csharp
return Ok(data);         // 200 — here is the data you asked for
return Created(...);     // 201 — I created the thing you asked for
return NotFound();       // 404 — that thing doesn't exist
return BadRequest(".."); // 400 — your request was wrong
return Unauthorized();   // 401 — you need to be logged in
```

### One controller per resource — and what about non-resources?

Yes, the convention is roughly one controller per resource (a noun in your
system: Rooms, Bookings, Venues). But it's a guideline, not a law:

- `AuthController` has no "auth table" — it's a logical grouping of login and
  register operations. Totally fine.
- `AvailabilityController` queries across multiple tables. Also fine.
- For one-off endpoints that genuinely don't fit anywhere (like a Stripe
  webhook), use a **Minimal API endpoint** — a single line directly in
  `Program.cs` without a controller class at all. That's exactly what they
  exist for.

### How data gets into a method

- **URL segment:** `GET /api/rooms/42` → `[HttpGet("{id}")]` + `int id` parameter
- **Query string:** `GET /api/rooms?venueId=1` → `int venueId` parameter (matched by name)
- **Request body:** `POST /api/bookings` with JSON → a DTO class with `[FromBody]`

A DTO (Data Transfer Object) is just a plain C# class that matches the shape
of incoming or outgoing JSON. You'll put these in a `DTOs/` folder.

---

## 3. MVC and Razor Pages

MVC and Razor Pages serve HTML from the server — the controller renders a
view, and the browser gets fully-formed HTML. This deliberately couples your
frontend and backend, which is the opposite of what you want.

However, you asked earlier about adding a server-rendered landing page for SEO
later. The answer is yes — ASP.NET Core is built to mix and match. You can add
Razor Pages to your existing API project just by registering them in
`Program.cs`. Your landing page at `/` becomes server-rendered HTML. Your API
endpoints at `/api/...` keep returning JSON. They live in the same project with
no conflict. This is a future step — ignore it completely for now.

---

## 4. AvailabilityRule — Venue or Room?

You asked a genuinely good question: does an `AvailabilityRule` belong to a
venue or a room? And you suggested a mapping table. Both instincts are correct.

Here's the real-world reality: most small rehearsal spaces open all their rooms
at the same time, so availability is effectively venue-level. But some venues
do have exceptions — "Room C is only available on weekends", or "The Big Room
needs an hour's setup so it opens at 11am". Room-level rules are a real need.

Your data engineering instinct about a mapping table is sound. Here's the
cleaner schema it leads to:

**MVP schema (simple, ship it):**

`AvailabilityRule` has a direct `RoomId` — each rule belongs to a specific room.
If all rooms share the same hours, you just create identical rules for each one.
This is a deliberate simplification that works perfectly for a single-venue
product.

**SLC schema upgrade (introduced in Milestone 9):**

- `AvailabilitySchedule` — a named set of rules, belonging to a Venue.
  Example: "Standard Hours", "Summer Hours", "Weekend Only".
- `AvailabilityScheduleSlot` — the actual day/time rules within a schedule.
  Each slot has a `ScheduleId`, a `DayOfWeek`, an `OpenTime`, and a `CloseTime`.
- `RoomSchedule` — the mapping table. Links a `RoomId` to a `ScheduleId`.

This means you can create one "Standard Hours" schedule and assign it to five
rooms with five rows in the mapping table. If hours change, you update one
schedule and all five rooms automatically reflect the change. Individual rooms
can be assigned different schedules when needed.

You'll build the MVP schema first. The SLC upgrade is a planned migration, not
a rework from scratch. Knowing the destination now doesn't mean you build it
now — it just means you won't be surprised by it later.

---

## 5. Logging — What It Is and Where It Goes

Logging is how your application tells you what it's doing while it's running.
In development, logs go to your terminal. In production, they go to a file or
a dedicated logging service where you can search them.

.NET has a built-in logging abstraction called `ILogger<T>`. You inject it into
any class the same way you inject services, and call methods on it:

```csharp
_logger.LogInformation("Booking {BookingId} confirmed", bookingId);
_logger.LogWarning("Slot {SlotTime} for room {RoomId} was already taken", ...);
_logger.LogError(ex, "Failed to create Stripe session for booking {BookingId}", ...);
```

The `T` in `ILogger<T>` is the class the logger belongs to — it means each log
line automatically includes which class it came from, which is invaluable when
debugging.

**Where logs go:**

- Into **service classes**, not controllers. Your controller is thin — it
  doesn't know enough about what's happening to log meaningfully. Your service
  knows it's about to charge a card, or that a slot was double-booked.
- At **entry points** for important operations: "Creating booking for room 3"
- At **decision points**: "Slot unavailable, returning 409"
- **Always** on exceptions and errors
- **Never** on every line — logs become useless when there are too many of them

**`ILogger` vs Serilog:**

The built-in `ILogger` is what you'll use throughout development. It works with
zero configuration — logs appear in your terminal automatically.

**Serilog** is a popular third-party library that plugs into `ILogger` (your
code doesn't change) and adds two things: **structured logging** (each log line
is a queryable object, not just a string) and **sinks** (places to write logs,
like files, databases, or services like Seq). You add Serilog before you deploy
to production, and your existing `_logger.LogInformation(...)` calls work with
it automatically.

You'll add `ILogger` injection from Milestone 2 onwards. Serilog gets added
in Milestone 10 (pre-deployment).

---

## 6. Solution Architecture

```
rehearsal-booking/
├── backend/
│   └── RehearsalBooking.sln
│       └── src/
│           └── RehearsalBooking.Api/     ← Everything lives here to start
│               ├── Controllers/
│               ├── Services/
│               ├── Models/
│               ├── DTOs/
│               └── Data/                 ← Added in Phase 2
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── api/
    ├── package.json
    └── vite.config.ts
```

Two projects you add later (when the single project feels cluttered):
- `RehearsalBooking.Application` — service classes and business logic
- `RehearsalBooking.Infrastructure` — EF Core, email, Stripe

Don't create these now.

---

## 7. Multi-Tenancy — Plain English

One deployed app serves multiple venues. Each venue's data is invisible to
every other venue. You achieve this by stamping every database row with a
`VenueId` and making every query filter automatically by the current venue.
The current venue is determined by the subdomain of the incoming request.

You build this last. Everything before it is built assuming one venue exists.
The refactor is manageable once you know the codebase well.

---

## 8. MVP Feature List

| Feature | Notes |
|---|---|
| Venue owner can log in | Protected admin area |
| Venue owner can manage rooms | Add, edit, deactivate — name, rate, capacity |
| Venue owner sets open hours | Per room (MVP schema) |
| Public booking page | No login required for customers |
| Customers see available slots | Picks a date, sees what's free |
| Customers make a booking | Name, email, phone, chosen slot |
| Customers pay a deposit | Via Stripe |
| Customer gets a confirmation email | After payment |
| Venue owner sees all bookings | Simple list |
| Venue owner can cancel | Sends cancellation email |

**Not in MVP:**
Customer accounts, automated reminders, refunds, multi-tenancy, reporting,
recurring bookings, schedule/mapping table for availability.

---

## 9. SLC Feature List

Everything in MVP, plus:

| Feature | Notes |
|---|---|
| Calendar view for admin | Week/month view |
| Automated reminder emails | 24h before booking |
| Customer cancellation | Within configurable window, auto-refund |
| Block out times | Maintenance, private events |
| Peak/off-peak pricing | Different rates at different times |
| Basic dashboard | Revenue, upcoming bookings, occupancy |
| Venue profile page | Logo, description, map embed |
| Availability schedule system | Schedule entity + mapping table per room |
| Multi-tenancy | Subdomain per venue, full data isolation |

---

## 10. Step-by-Step Build Guide

---

### PHASE 1 — WALKING SKELETON
#### *A complete user journey in the browser, backed by fake data*

The goal of this phase: a customer can open the app, see rooms, pick a date,
see slots, fill in their details, and submit a booking. Nothing is persisted.
Everything is hardcoded or in-memory. But the whole pipeline — React → HTTP →
API → response → React renders it — works end to end.

---

#### Step 1 — Create the Backend Project

```bash
mkdir rehearsal-booking && cd rehearsal-booking
mkdir backend && cd backend
dotnet new sln -n RehearsalBooking
mkdir src
dotnet new webapi -n RehearsalBooking.Api -o src/RehearsalBooking.Api
dotnet sln add src/RehearsalBooking.Api/RehearsalBooking.Api.csproj
cd src/RehearsalBooking.Api
dotnet run
```

Navigate to `https://localhost:5001/swagger`. You'll see the Swagger UI —
a built-in page that lists and lets you test your API endpoints. This is your
best friend during development.

Read through `Program.cs` before changing anything. Every line is doing
something real — registering services, setting up middleware, enabling Swagger.
You don't need to understand all of it now, but notice the shape.

Delete the template files: `WeatherForecast.cs` and
`Controllers/WeatherForecastController.cs`.

**Resource:** [ASP.NET Core Web API overview](https://learn.microsoft.com/en-us/aspnet/core/web-api/)

**Done when:** Swagger loads with no errors.

---

#### Step 2 — Create the React Frontend

From the root `rehearsal-booking` folder:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

Now set up Tailwind by following their Vite guide exactly — it takes about
two minutes: [Tailwind + Vite](https://tailwindcss.com/docs/guides/vite).

Set up shadcn/ui using their Vite guide — about five minutes:
[shadcn/ui Vite](https://ui.shadcn.com/docs/installation/vite).

Clean out `App.tsx` — delete everything inside it and replace with a single
heading so you know it's alive.

**Done when:** React app loads at `localhost:5173` with no errors.

---

#### Step 3 — Make the Two Apps Talk

This is the most important step of Phase 1. Configure **CORS** on the backend
so the browser permits requests from your frontend's origin. Without this, the
browser blocks cross-origin requests as a security measure.

In `Program.cs`, before `app.Build()`, define a CORS policy that allows
your frontend URL (`http://localhost:5173`). After `app.Build()`, call
`app.UseCors(policyName)`. The exact lines are in the documentation:

**Resource:** [Enable CORS in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/cors) — read the "Add a CORS policy" section only.

Create `Controllers/HealthController.cs`. It should inherit from
`ControllerBase`, be decorated with `[ApiController]` and
`[Route("api/[controller]")]`, and have one method decorated with
`[HttpGet]` that returns `Ok(new { status = "healthy" })`.

In your React app, create `src/api/client.ts`. For now, hardcode the base URL:

```typescript
// TODO: move to environment variable before deployment (see Step 18)
export const API_BASE_URL = 'https://localhost:5001'
```

The comment is a deliberate reminder. You know it's temporary. You'll fix it
in Step 18 — not before.

Create `src/api/health.ts` with a function that fetches `/api/health` using
`API_BASE_URL` and returns the parsed JSON. Call it from a `useEffect` in
`App.tsx` and log the result to the console.

When you see `{ status: "healthy" }` in the browser console, the pipeline
works. Open DevTools → Network tab and watch the request go out and come back.
You can see the headers, body, and status code. Get comfortable here — it's
how you debug API calls for the rest of this project.

**Resources:**
- [Fetch API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [HTTP status codes — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

**Done when:** Browser console shows `{ status: "healthy" }`.

---

#### Step 4 — Rooms Endpoint (In-Memory)

Create a `Models/` folder and add `Room.cs` — a simple class with `Id`,
`Name`, `HourlyRate` (decimal), and `Capacity` (int). This is your first
domain model. Keep it plain — no database attributes yet.

Create `Controllers/RoomsController.cs`. At the top of the class, declare
a private static list of a few hardcoded rooms. Static means the list lives
at the class level, shared across requests — fine for fake data.

Add two actions:

- `GET /api/rooms` — returns the full list wrapped in `Ok(...)`
- `GET /api/rooms/{id}` — returns the matching room, or `NotFound()` if none

Make the actions `async Task<IActionResult>`. There's nothing async happening
yet, but you're establishing the pattern you'll use once EF Core is in.
Return `Task.FromResult` wrapped results if your IDE complains, or just add
`await Task.CompletedTask` — the key is getting comfortable with the pattern.

Check both endpoints in Swagger.

**Resource:** [Create web APIs with ASP.NET Core — tutorial](https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api)

**Done when:** Both room endpoints return hardcoded data in Swagger.

---

#### Step 5 — Rooms List Page (Frontend)

Set up routing first:

```bash
npm install react-router-dom
```

In `main.tsx`, wrap your app in `<BrowserRouter>`. In `App.tsx`, set up two
routes: `/rooms` and `/book/:roomId`. You'll build the second page shortly.

Create `src/api/rooms.ts`. Define a TypeScript interface that mirrors your
`Room` model (id, name, hourlyRate, capacity), then write an async function
`getRooms()` that fetches `/api/rooms` from `API_BASE_URL` and returns the
typed result.

Create `src/pages/RoomsPage.tsx`. This component fetches rooms on mount using
`useEffect` and `useState`. It has three rendering states: loading (a spinner
or "Loading..." text), error (an error message), and success (the rooms list).

For each room, render a card with its name, rate, and capacity, plus a button
that navigates to `/book/{room.id}`. Use shadcn/ui's `Card` component and
Tailwind for layout — a simple CSS grid or flex row of cards works well.

**Resources:**
- [React hooks — useEffect and useState](https://react.dev/reference/react)
- [React Router — useNavigate and Link](https://reactrouter.com/en/main/start/tutorial)
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card)

**Done when:** Navigate to `/rooms` in the browser and see your hardcoded rooms.

---

#### Step 6 — Availability Endpoint (In-Memory)

This is your first "non-resource" endpoint. Create
`Controllers/AvailabilityController.cs`.

Add one action: `GET /api/availability` that accepts `roomId` (int) and `date`
(DateOnly or string — DateOnly is cleaner) as query parameters. Return a list
of available `DateTime` slots.

For Phase 1, hardcode the logic: assume the venue is open 10am–10pm every day,
and return all hourly slots in that range with no booking checks. The list will
always be the same regardless of date. That's fine — you're testing the pipeline.

The logic for generating time slots should live in a `Services/AvailabilityService.cs`
class, not in the controller. Write a method that takes a `DateOnly` and returns
`List<DateTime>` by walking from `OpenTime` to `CloseTime` in one-hour increments.

Register the service in `Program.cs`:

```csharp
builder.Services.AddScoped<AvailabilityService>();
```

`AddScoped` means one instance per HTTP request — the right lifetime for
services that will eventually use a DbContext (also scoped).

Inject `AvailabilityService` into the controller via its constructor. The
controller calls the service; it doesn't contain the logic itself.

Create `src/api/availability.ts` in React with a typed function
`getAvailableSlots(roomId: number, date: string)`.

**Resource:** [Dependency injection in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)

**Done when:** `GET /api/availability?roomId=1&date=2025-08-15` returns a
list of time slots in Swagger.

---

#### Step 7 — Bookings Endpoint (In-Memory)

Create a `DTOs/` folder and add `CreateBookingRequest.cs` — a class with
`RoomId`, `CustomerName`, `CustomerEmail`, `CustomerPhone`, `StartTime`,
and `EndTime`. This is the shape of the JSON the frontend will send.

Add a `Booking.cs` to `Models/` with the same fields plus `Id`, `TotalPrice`,
`Status` (use a C# `enum`: Pending, Confirmed, Cancelled), and `CreatedAt`.

Create `Controllers/BookingsController.cs`. Add a private static list to store
bookings in memory, and a counter for generating sequential IDs. Add one action:

- `POST /api/bookings` — reads a `[FromBody] CreateBookingRequest`, creates a
  new `Booking` object, adds it to the static list, and returns `Created(...)`
  with the new booking

The `[FromBody]` attribute tells ASP.NET Core to read the request body as JSON
and deserialise it into your DTO class automatically.

For the price: hardcode `15m` per hour for now. When EF Core arrives, you'll
look up the room's actual hourly rate.

Create `src/api/bookings.ts` in React with a typed `createBooking(data)` function.

**Done when:** A POST to `/api/bookings` in Swagger creates a booking and
returns it. You can call GET again and see it in the list.

---

#### Step 8 — Booking Page (Frontend)

Create `src/pages/BookingPage.tsx`. Get the `roomId` from the URL with
`useParams`.

The page has three sequential states, controlled with a `useState`:

**"date"** — Show a date picker. When the date changes, call `getAvailableSlots`
and move to "slots". A plain `<input type="date">` with `min` set to today is
fine.

**"slots"** — Show the returned time slots as buttons. Each one is a 1-hour
block (format it: "14:00 – 15:00"). Clicking one selects it and moves to
"details".

**"details"** — Show a form for name, email, and phone. Each input is a
controlled component: it has a `value` tied to state and an `onChange` that
updates that state. On submit, call `createBooking(...)` and navigate to
`/booking-confirmed`.

Add a simple `src/pages/BookingConfirmedPage.tsx` that just says "Booking
received — you'll hear from us shortly."

**Resources:**
- [React — reacting to input with state](https://react.dev/learn/reacting-to-input-with-state)
- [shadcn/ui Button and Input components](https://ui.shadcn.com/docs/components/button)

**Done when:** You can complete the full booking journey in the browser — rooms
list, slot picker, form, confirmation page — end to end.

---

### ✅ PHASE 1 COMPLETE

You have a walking skeleton. The entire user-facing flow works. Every piece of
the pipeline — React, HTTP, controller, service, response, React renders it —
has been exercised. Now you replace the fake data with real persistence.

---

### PHASE 2 — ADD THE DATABASE
#### *Swap in-memory data for EF Core without touching the frontend*

---

#### Step 9 — Add EF Core and Your Domain Models

Install packages:

```bash
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

Now expand your `Models/` to the full set. You have `Room` and `Booking`
already — add `Venue` and `AvailabilityRule`. Here's what each needs:

**Venue:** Id, Name, Description, Slug (the URL-safe short name, e.g. "rock-house"),
ContactEmail, CreatedAt. Navigation property: a `List<Room>`.

**Room:** Id, VenueId (foreign key), Name, Description, HourlyRate (decimal),
Capacity, IsActive (bool, default true). Navigation properties: a `Venue` and
a `List<Booking>`.

**AvailabilityRule (MVP schema):** Id, RoomId (foreign key), DayOfWeek (the
built-in C# `DayOfWeek` enum), OpenTime (`TimeOnly`), CloseTime (`TimeOnly`).
Navigation property: a `Room`.

Note: you're assigning availability rules to rooms, not venues. If all rooms
share the same hours, you'll create the same rule for each one. In the SLC phase
you'll upgrade this to the schedule + mapping table design — for now this is
deliberate simplification.

**Booking:** Id, RoomId, CustomerName, CustomerEmail, CustomerPhone,
StartTime (`DateTime`), EndTime (`DateTime`), TotalPrice (decimal),
DepositPaid (decimal), Status (your `BookingStatus` enum), StripeSessionId
(nullable string), Notes (nullable string), CreatedAt.

A note on navigation properties: the property linking two models (like
`Room.Venue`) is called a navigation property. The `VenueId` integer is the
foreign key. EF Core needs both — the foreign key for the database, and the
navigation property to load related data.

**Resource:** [EF Core relationships](https://learn.microsoft.com/en-us/ef/core/modeling/relationships)

**Done when:** All four model files exist, project compiles.

---

#### Step 10 — Create the DbContext

Create `Data/AppDbContext.cs`. This class inherits from `DbContext` and contains
a `DbSet<T>` property for each of your models. Think of each `DbSet` as
representing one database table. You interact with the table through it.

In the `OnModelCreating` override, configure your decimal columns to use
`HasPrecision(10, 2)` — without this EF Core emits a warning because SQLite
stores decimals as text and you want to be explicit about precision. Do this
for `Room.HourlyRate`, `Booking.TotalPrice`, and `Booking.DepositPaid`.

Register the DbContext in `Program.cs` with:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=rehearsal.db"));
```

Install the EF Core CLI:

```bash
dotnet tool install --global dotnet-ef
```

Create your first migration and apply it:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

A migration is a snapshot of your schema. The first command creates a C# file
in `Migrations/` describing how to create your tables. The second command
runs it and creates the database file. Install the "SQLite Viewer" VS Code
extension and open `rehearsal.db` to see your tables.

**Resource:** [EF Core — getting started](https://learn.microsoft.com/en-us/ef/core/get-started/overview/first-app)

**Done when:** `rehearsal.db` exists and has your four tables.

---

#### Step 11 — Seed Test Data

Create `Data/SeedData.cs` with a static `Initialize(AppDbContext db)` method.
Check if any venues exist — if so, return early (already seeded). If not:

- Create one `Venue`
- Create three `Room` objects linked to it
- Create `AvailabilityRule` records for that venue's rooms — Monday through
  Saturday, 10am–10pm

Call this from `Program.cs` after `app.Build()`:

```csharp
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
SeedData.Initialize(db);
```

This pattern — getting a service from the DI container manually — is used for
setup tasks that happen outside a normal HTTP request. The `using var scope`
ensures the scope is disposed correctly when the block exits.

**Done when:** Run the app, open SQLite Viewer, and see your venue, rooms, and
availability rules in the database.

---

#### Step 12 — Swap In-Memory Data for EF Core

Now you replace the static lists in your controllers with real database calls.
This is satisfying because the frontend doesn't change at all.

**In `RoomsController`:**

Inject `AppDbContext` via the constructor (add it as a constructor parameter —
ASP.NET Core's DI provides it automatically because you registered it in
`Program.cs`). Delete the static list. Replace the `GetAll` return with:

```csharp
var rooms = await _db.Rooms.Where(r => r.IsActive).ToListAsync();
return Ok(rooms);
```

EF Core operations should always be awaited — `ToListAsync()` not `ToList()`.
This keeps your server responsive while waiting on the database.

Replace `GetOne` similarly, using `FirstOrDefaultAsync(r => r.Id == id)`.

**In `AvailabilityService`:**

Inject `AppDbContext`. In `GetAvailableSlots`, replace the hardcoded open/close
times with a database query: look up the `AvailabilityRule` for the given room
and day of week. If none is found (venue is closed that day), return an empty
list. Then fetch existing non-cancelled bookings for that room and date, and
filter them out of your generated slot list.

**In `BookingsController`:**

Inject `AppDbContext`. Delete the static list. In the `POST` action, look up
the room to get the actual hourly rate for the price calculation, save the
booking via `_db.Bookings.Add(booking)` followed by `await _db.SaveChangesAsync()`.

Add `ILogger<BookingsController>` to the constructor while you're here —
you'll use it in the next step.

**Resource:** [EF Core — querying data](https://learn.microsoft.com/en-us/ef/core/querying/)

**Done when:** The full booking journey works in the browser and bookings
appear in the SQLite database.

---

### ✅ PHASE 2 COMPLETE

You now have a real database behind a real API. The walking skeleton has grown
a skeleton proper.

---

### MILESTONE 3 — ADD LOGGING

Add logging now, before auth and payments. That way every feature you build
from this point forward gets logged as you write it, and you'll have a much
easier time debugging anything that goes wrong.

---

#### Step 13 — ILogger in Your Services

`ILogger<T>` is built into .NET — zero extra packages needed. Inject it into
your service classes by adding `ILogger<AvailabilityService>` as a constructor
parameter (EF Core and DI handle the rest). Store it as a private readonly
field.

Add logging in `AvailabilityService`:
- `LogInformation` at the start of `GetAvailableSlots` — "Fetching slots for
  room {RoomId} on {Date}"
- `LogWarning` when no availability rule is found — "No availability rule for
  room {RoomId} on {DayOfWeek}, returning empty"

Add logging in `BookingsController` (or a `BookingService` if you've extracted
one):
- `LogInformation` when a booking is created — include the room ID and
  customer email
- `LogError` in any catch blocks — always include the exception object as the
  first argument so the stack trace is captured

The string format for ILogger uses named placeholders in curly braces, not
string interpolation. This is important: `LogInformation("Room {RoomId}", id)`
not `LogInformation($"Room {id}")`. Named placeholders enable structured
logging — each value is stored as a searchable property, not just baked into
a string.

Run the app and make a booking. Watch your terminal — you'll see your log lines
appear. Now you have visibility into what your app is doing.

**Resource:** [Logging in .NET](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/)

**Done when:** Log lines appear in the terminal when you make a booking.

---

#### Step 14 — Add Serilog (Pre-Deployment)

*Do this step when you're ready to deploy, not now. Come back to it then.*

Serilog plugs into your existing `ILogger` calls — you don't change any
logging code you've already written. It adds two things: structured logging
and sinks (outputs like files and services).

```bash
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.File
dotnet add package Serilog.Sinks.Console
```

Replace the default logging setup in `Program.cs` with Serilog configuration.
The exact lines are in the quickstart below.

**Resource:** [Serilog ASP.NET Core — getting started](https://github.com/serilog/serilog-aspnetcore#getting-started)

---

### MILESTONE 4 — AUTHENTICATION

---

#### Step 15 — Add ASP.NET Core Identity

ASP.NET Core Identity is a complete authentication system — user storage,
password hashing, login, and more. Install the package:

```bash
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
```

Change `AppDbContext` to inherit from `IdentityDbContext<IdentityUser>` instead
of `DbContext`. This automatically adds Identity's tables (users, roles, claims)
to your schema.

Register Identity in `Program.cs`:

```csharp
builder.Services.AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();
```

Create a new migration and apply it. New tables (`AspNetUsers`, etc.) will
appear in your database.

**Resource:** [ASP.NET Core Identity introduction](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity)

**Done when:** Migration runs, new tables appear in SQLite Viewer.

---

#### Step 16 — JWT Authentication

Your API is stateless — no sessions. When a venue owner logs in, the server
issues a **JWT token** (a signed string). The client stores it and sends it
with every future request in the `Authorization` header. The server verifies
the signature to confirm it's legitimate.

Install:

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

Add a `"Jwt"` section to `appsettings.json` with `"Key"`, `"Issuer"`, and
`"Audience"` fields. The key should be a long random string. Do not commit
real secrets to git. Use .NET user secrets for local development:

```bash
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "a-long-random-string-here"
```

Register JWT authentication in `Program.cs`. Follow the resource below for
the exact configuration — it's around ten lines and you'll write it once.

Create `Controllers/AuthController.cs` with two actions:

- `POST /api/auth/register` — uses Identity's `UserManager<IdentityUser>` to
  create a new user. `UserManager` is injected the same way as other services.
- `POST /api/auth/login` — verifies credentials via `UserManager`, and if
  valid, generates and returns a JWT token

Token generation uses `JwtSecurityToken` with your configured settings, signed
with your secret key. This is boilerplate you write once. Copy it carefully
from the resource, understand each line, and don't change it.

Log the login attempt in `AuthController` — both success and failure cases,
being careful not to log the password.

**Resource:** [JWT auth in ASP.NET Core](https://www.infoworld.com/article/3622301/how-to-implement-jwt-authentication-in-aspnet-core.html)
— follow closely for token generation code.

**Done when:** POST to `/api/auth/login` with valid credentials returns a JWT
token string.

---

#### Step 17 — Protect Admin Endpoints

Add `[Authorize]` to any action that should require a logged-in user. Add it
to `GET /api/admin/bookings` and `POST /api/admin/bookings/{id}/cancel`
(which you'll add in the next step). Any request without a valid JWT token in
the `Authorization: Bearer <token>` header will automatically get a 401 response.

In React, when the user logs in, store the JWT token in memory via a React
Context (not localStorage — for the moment in-memory is fine for development).
Include it in the `Authorization` header of any fetch call that hits a protected
endpoint:

```typescript
headers: { 'Authorization': `Bearer ${token}` }
```

**Done when:** Hitting a protected endpoint without a token returns 401.
With a token, it returns 200.

---

### MILESTONE 5 — ADMIN DASHBOARD

---

#### Step 18 — Move Base URL to an Environment Variable

This is the cleanup step flagged back in Step 3. Now that you're building the
admin frontend, it's worth doing this properly before adding more API calls.

In React with Vite, environment variables are stored in a `.env` file:

```
VITE_API_BASE_URL=https://localhost:5001
```

Vite exposes any variable prefixed with `VITE_` to your client code via
`import.meta.env`. Update `src/api/client.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

Add `.env` to `.gitignore`. Create a `.env.example` file with placeholder
values for anyone else setting up the project. When you deploy, you'll set
`VITE_API_BASE_URL` to your real production domain in your hosting environment.

**Done when:** The app still works, base URL comes from the env file.

---

#### Step 19 — Login Page

Create `src/pages/LoginPage.tsx`. A form with email and password. On submit,
call `POST /api/auth/login`. On success, store the token in an `AuthContext`
and navigate to `/admin/bookings`.

Create `src/context/AuthContext.tsx`. It holds the current token (or null),
exposes login and logout functions, and wraps the app so any component can
access auth state.

Add a protected route wrapper: a component that checks if a token is present
and redirects to `/login` if not. Wrap your admin routes with it.

**Resource:** [React context](https://react.dev/learn/passing-data-deeply-with-context)

---

#### Step 20 — Admin Bookings List

Add `GET /api/admin/bookings` to `BookingsController`, decorated with
`[Authorize]`. It returns all bookings with their room names included —
use `.Include(b => b.Room)` in your EF Core query to load the related room
in the same database round-trip.

Add `POST /api/admin/bookings/{id}/cancel`. This is a named sub-action rather
than a generic PUT — cancelling has specific rules and a specific side-effect
(it will trigger an email). Set the booking's status to Cancelled and save.
Log the cancellation: who cancelled it and when.

Create `src/pages/admin/BookingsPage.tsx`. Fetch the bookings endpoint,
passing the JWT token. Render a table with room, customer, date/time, status,
and a Cancel button. Use shadcn/ui's `Table` component.

**Resource:** [EF Core — loading related data](https://learn.microsoft.com/en-us/ef/core/querying/related-data/eager)

**Done when:** Admin can log in, see all bookings, and cancel one.

---

### MILESTONE 6 — STRIPE PAYMENTS

Stripe's documentation is genuinely excellent. You will not struggle here.

---

#### Step 21 — Stripe Checkout

Create a Stripe account and get test API keys from the dashboard.

```bash
dotnet add package Stripe.net
```

Store keys in user secrets:

```bash
dotnet user-secrets set "Stripe:SecretKey" "sk_test_..."
```

Modify the booking creation flow in `BookingsController`. After saving a new
`Pending` booking, call a method on a new `StripeService` class that creates
a **Checkout Session**. A Checkout Session is a Stripe-hosted payment page —
you send Stripe the details and it returns a URL. You return this URL from your
endpoint instead of the booking object.

The session needs: the deposit amount in pence (Stripe uses integers — £10.50
is `1050`), a product description, a success URL (`/booking-confirmed/{id}`),
a cancel URL, and the booking ID in the session metadata (so you can find the
booking again when Stripe calls your webhook).

In React, when the booking endpoint returns a URL, redirect to it:

```typescript
window.location.href = stripeCheckoutUrl
```

Use test card `4242 4242 4242 4242` with any future expiry.

Log the creation of the Stripe session in `StripeService` — include the
booking ID and the session ID.

**Resource:** [Stripe Checkout quickstart — .NET](https://stripe.com/docs/checkout/quickstart?lang=dotnet)

**Done when:** Completing a booking redirects to Stripe's hosted payment page.

---

#### Step 22 — Stripe Webhook

When payment completes, Stripe calls a URL on your server. This is a webhook.

Add a Minimal API endpoint in `Program.cs` — not a controller. This is the
right place for a one-off endpoint that doesn't belong to any resource group:

```csharp
app.MapPost("/api/webhooks/stripe", async (HttpRequest req, AppDbContext db, ...) =>
{
    // read raw body, verify Stripe signature, handle the event
});
```

The handler reads the raw request body, uses Stripe's `EventUtility.ConstructEvent`
to verify the signature (prevents fake webhook calls), checks for the
`checkout.session.completed` event type, finds the booking by the session ID
stored in metadata, and sets its status to `Confirmed`.

For local webhook testing, install the Stripe CLI:

```bash
stripe listen --forward-to https://localhost:5001/api/webhooks/stripe
```

Log every webhook event received (event type and booking ID) and any
verification failures as warnings.

**Resource:** [Stripe webhooks — .NET](https://stripe.com/docs/webhooks)

**Done when:** Completing a test payment updates the booking status to Confirmed
in the database.

---

### MILESTONE 7 — EMAIL CONFIRMATIONS

---

#### Step 23 — Transactional Email with Resend

Resend is the easiest transactional email service to start with. Free tier is
generous, the API is minimal, and the .NET library is straightforward.

```bash
dotnet add package Resend
```

Store the API key in user secrets. Create `Services/EmailService.cs` with a
method `SendBookingConfirmationAsync(Booking booking)`. Build an email with the
customer's details, room name, time, deposit paid, and balance due on the day.
An HTML string for the body is fine for now — no template engine needed yet.

Call this from your Stripe webhook handler after confirming the booking.

Log success and failure of email sending in `EmailService`. A failed email
should be logged as an error — you'll want to know about it.

**Resource:** [Resend .NET quickstart](https://resend.com/docs/send-with-dotnet)

**Done when:** Completing a test payment triggers a confirmation email.

---

### 🎉 MVP COMPLETE AT END OF MILESTONE 7

A real venue can use this. Deploy it. Find one Edinburgh rehearsal space and
offer to set them up for free. Real feedback at this stage is worth more than
any feature you could add.

---

### MILESTONE 8 — EXTRACT INFRASTRUCTURE PROJECT

Do this when the `Api` project feels cluttered — probably around this point.

```bash
cd backend
dotnet new classlib -n RehearsalBooking.Infrastructure \
    -o src/RehearsalBooking.Infrastructure
dotnet sln add src/RehearsalBooking.Infrastructure/\
    RehearsalBooking.Infrastructure.csproj
dotnet add src/RehearsalBooking.Api reference \
    src/RehearsalBooking.Infrastructure
```

Move to `Infrastructure`: `AppDbContext`, `Migrations/`, `SeedData`,
`EmailService`, `StripeService`.

Keep in `Api`: all controllers, remaining services, `Program.cs`, DTOs, Models.

You'll need to add the EF Core and other package references to the Infrastructure
project and remove them from Api where they're no longer needed. Fix compiler
errors as they appear — this is a good way to understand what depends on what.

**Done when:** The project still compiles and all tests still pass.

---

### MILESTONE 9 — SLC FEATURES

---

#### Step 24 — Availability Schedule System (Schema Upgrade)

This is the migration from the MVP availability schema (rules per room) to the
SLC schema (reusable schedules with a mapping table).

Create a new migration that:
- Adds `AvailabilitySchedule` table (Id, VenueId, Name)
- Adds `AvailabilityScheduleSlot` table (Id, ScheduleId, DayOfWeek, OpenTime, CloseTime)
- Adds `RoomSchedule` mapping table (RoomId, ScheduleId)

Write a data migration alongside the schema migration: copy existing
`AvailabilityRule` data into the new tables (one schedule per unique set of
rules, linked to the appropriate rooms).

Update `AvailabilityService` to query via the new tables.

**Done when:** Existing bookings and availability still work correctly after
the migration.

---

#### Step 25 — Multi-Tenancy

By this point you know the codebase well. The refactor is manageable.

**Add a `VenueId` column to `Bookings`** (Room, AvailabilitySchedule, and
AvailabilityRule already have it). Create a migration.

**Create a `TenantContext` service** — a scoped service that holds one thing:
the current venue. Registered as `AddScoped` in `Program.cs`.

**Write middleware** that runs before every controller. Middleware is a
function that sits between the HTTP request arriving and your controller
handling it. Think of it as a checkpoint every request passes through. Your
middleware reads the subdomain from the incoming request URL, looks up the
matching `Venue` in the database, and stores it in `TenantContext`.

For local development, read from a `?venue=rock-house` query parameter
instead of a subdomain — add a branch in the middleware: if the host is
`localhost`, read from query string; otherwise, read from subdomain.

Register the middleware in `Program.cs` before `app.MapControllers()`:

```csharp
app.UseMiddleware<TenantResolutionMiddleware>();
```

**Add EF Core global query filters** in `AppDbContext.OnModelCreating`. For
each model that has a VenueId, add a filter that compares it to the current
`TenantContext.CurrentVenueId`. Inject `TenantContext` into `AppDbContext`
via its constructor. After this, every query is automatically tenant-scoped —
you never manually add `WHERE VenueId = X` anywhere.

**Resources:**
- [ASP.NET Core middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/)
- [EF Core global query filters](https://learn.microsoft.com/en-us/ef/core/querying/filters)

**Done when:** Requests from two different subdomains return different data.

---

### MILESTONE 10 — PRE-DEPLOYMENT

---

#### Step 26 — Add Serilog

Come back to Step 14 and follow it now. Write logs to both console and a
rolling file.

---

#### Step 27 — Switch to PostgreSQL

In `Program.cs`, change the EF Core registration from SQLite to PostgreSQL:

```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

Replace `UseSqlite(...)` with `UseNpgsql(connectionString)` where the
connection string comes from an environment variable or user secret. Run
`dotnet ef database update` against your PostgreSQL instance. Everything
else stays the same.

---

#### Step 28 — Set Production Environment Variables

On your hosting provider, set:
- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__Default=<your postgres connection string>`
- `Jwt__Key=<your production secret>`
- `Stripe__SecretKey=<your live key>`
- `Resend__ApiKey=<your key>`

On the frontend hosting provider, set:
- `VITE_API_BASE_URL=https://api.yourapp.co.uk`

---

## 11. Resource Reference

| Topic | Resource |
|---|---|
| ASP.NET Core Web API | [learn.microsoft.com/aspnet/core/web-api](https://learn.microsoft.com/en-us/aspnet/core/web-api/) |
| Web API tutorial (first API) | [learn.microsoft.com — first web API](https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api) |
| EF Core complete docs | [learn.microsoft.com/ef/core](https://learn.microsoft.com/en-us/ef/core/) |
| EF Core — querying | [learn.microsoft.com — querying](https://learn.microsoft.com/en-us/ef/core/querying/) |
| EF Core — eager loading | [learn.microsoft.com — related data](https://learn.microsoft.com/en-us/ef/core/querying/related-data/eager) |
| EF Core global query filters | [learn.microsoft.com — query filters](https://learn.microsoft.com/en-us/ef/core/querying/filters) |
| ASP.NET Core middleware | [learn.microsoft.com — middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/) |
| ASP.NET Core Identity | [learn.microsoft.com — Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity) |
| JWT auth in ASP.NET Core | [infoworld.com JWT tutorial](https://www.infoworld.com/article/3622301/how-to-implement-jwt-authentication-in-aspnet-core.html) |
| Logging in .NET | [learn.microsoft.com — logging](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/) |
| Serilog ASP.NET Core | [github.com/serilog/serilog-aspnetcore](https://github.com/serilog/serilog-aspnetcore#getting-started) |
| Dependency injection | [learn.microsoft.com — DI](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection) |
| Minimal APIs | [learn.microsoft.com — minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis) |
| CORS in ASP.NET Core | [learn.microsoft.com — CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors) |
| Stripe Checkout (.NET) | [stripe.com/docs/checkout/quickstart](https://stripe.com/docs/checkout/quickstart?lang=dotnet) |
| Stripe webhooks | [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks) |
| Resend (.NET) | [resend.com/docs/send-with-dotnet](https://resend.com/docs/send-with-dotnet) |
| React official docs | [react.dev](https://react.dev) — start with the Learn section |
| React Router | [reactrouter.com — tutorial](https://reactrouter.com/en/main/start/tutorial) |
| React context | [react.dev — context](https://react.dev/learn/passing-data-deeply-with-context) |
| Tailwind + Vite | [tailwindcss.com/docs/guides/vite](https://tailwindcss.com/docs/guides/vite) |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com) |
| TypeScript in 5 minutes | [typescriptlang.org](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) |
| HTTP status codes | [developer.mozilla.org/HTTP/Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) |
| Fetch API | [developer.mozilla.org/Fetch_API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) |
| YouTube — .NET | **Nick Chapsas** — high quality, modern .NET |
| YouTube — .NET beginner | **IAmTimCorey** — thorough, beginner-friendly |
| YouTube — React | **Theo (t3.gg)** — opinionated, practical |

---

## 12. Milestone Summary

| Milestone | What you have | Ship it? |
|---|---|---|
| Phase 1 complete | Full booking flow in browser, fake data | Show people — get feedback |
| Phase 2 complete | Real database behind the API | Yes |
| 3 — Logging | Visibility into what the app is doing | Yes |
| 4 — Auth | Protected admin area | Yes |
| 5 — Admin dashboard | Venue owner manages bookings | Yes |
| 6 — Stripe | Real money | Yes |
| 7 — Email | Confirmations sent | **MVP complete** |
| 8 — Extract Infrastructure | Cleaner codebase | Internal refactor |
| 9 — SLC features | Schedules, calendar, reminders, multi-tenancy | **SLC complete** |
| 10 — Pre-deployment | Serilog, Postgres, env vars | Production-ready |

---

## 13. Answers to Your Questions

**Should I build all backend endpoints before touching the frontend?**

No — the walking skeleton approach is better. Phase 1 of this guide follows it
exactly: build each endpoint with fake data, immediately build the frontend that
calls it, then move to the next endpoint. By the end of Phase 1 you have a
complete clickable flow with no database. Phase 2 swaps in EF Core without
touching the frontend. You maintain momentum throughout and always have
something visible to show.

**Does an AvailabilityRule belong to a venue or a room?**

For MVP: a room. Most venues have the same hours across rooms, so you'll create
identical rules per room — minor duplication, but simple to query. For SLC: the
schedule + mapping table design lets you create one "Standard Hours" schedule
and assign it to all rooms. Room-specific exceptions are then just assigning a
different schedule to one room. Both models are in this guide.

**Is the schedule/mapping table design sound from a data engineering perspective?**

Yes. You identified the normalisation problem correctly: if availability rules
are stored denormalised per room, changing a venue's hours requires updating
many rows. The schedule entity + mapping table means one update propagates to
all assigned rooms automatically. The MVP schema is a deliberate choice to ship
faster, not an oversight.

**Where does logging go?**

In service classes, not controllers (thin controller, fat service — logging
belongs with the logic). Use named placeholders, not string interpolation.
Log at entry points of important operations, at decision branches that affect
business outcomes, and always on errors. Use `ILogger<T>` built-in throughout
development. Add Serilog before deployment.
