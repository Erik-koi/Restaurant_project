# LaRestaurant

Restaurant finder website with an Express server, restaurant information pages, and a favorites API.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

From the `Restaurant` project root, install dependencies and start the server:

```powershell
npm install
npm start
```

Open <http://localhost:3000> in a browser. The server prints its address when it starts.

## Pages

- `/` - home page
- `/pages/menu.html` - restaurant menu and favorites
- `/pages/contact-information.html` - restaurant locations and map
- `/pages/book-table.html` - table booking page
- `/pages/login.html` - sign in
- `/pages/register.html` - account registration
- `/pages/admin.html` - admin page

## API

- `GET /health` - server health check
- `GET /api/restaurants` - restaurant list from the Metropolia restaurant API
- `GET /api/restaurants/:id` - one restaurant
- `GET /api/restaurants/daily/:id/:lang` - restaurant daily menu
- `GET /api/favorites?email=...` - favorites for an email
- `POST /api/favorites` - add a favorite; JSON body: `{ "email": "...", "restaurantId": "..." }`
- `DELETE /api/favorites/:restaurantId?email=...` - remove a favorite
- `POST /api/users` - register a user; JSON body: `{ "name": "...", "email": "...", "password": "..." }`
- `POST /api/login` - log in a registered user; JSON body: `{ "email": "...", "password": "..." }`
- `POST /api/logout` - end the current server session
- `PATCH /api/users/:email` - update a user's name; JSON body: `{ "name": "..." }`
- `GET /api/users` - list registered users without password data for an admin session
- `GET /api/reservations/availability?startsAt=...` - list table numbers reserved during a time slot
- `POST /api/reservations` - reserve a table for a logged-in user; JSON body: `{ "tableNumber": 4, "startsAt": "..." }`
- `GET /api/admin/reservations` - list active reservations for an admin session
- `DELETE /api/admin/reservations/:id` - remove a reservation as an admin

Users, favorites, and reservations are stored locally in `data/`. Reservations last two hours and are removed automatically after they expire. Passwords are stored as bcrypt hashes, and login state is kept in an HTTP-only server session. Restaurant data is retrieved from the external Metropolia API.

## Project structure

```text
Restaurant/
├── data/                 # Local favorites data
├── public/
│   ├── assets/fonts/      # Font files
│   ├── css/               # Page stylesheets
│   ├── js/                # Browser scripts
│   ├── pages/             # Secondary HTML pages
│   └── index.html         # Home page
├── server.js              # Express server and API routes
├── package.json
└── README.md
```