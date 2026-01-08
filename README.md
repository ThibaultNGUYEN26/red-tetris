# red-tetris

## Project Structure

This project is organized using a multi-branch workflow to separate concerns:

- **`backend`** - Contains the backend server setup and API
- **`frontend`** - Contains the React.js frontend application with all UI components and client-side logic

## Getting Started

To set up and run the frontend application, follow these steps:

### Setup Frontend

1. **Switch to the backend branch and merge the frontend code:**

   First, checkout the backend branch where the server code lives:
   ```bash
   git checkout backend
   ```

   Then merge the frontend branch to combine both frontend and backend code:
   ```bash
   git merge frontend
   ```

2. **Install all required dependencies:**

   This will download and install all npm packages defined in `package.json`:
   ```bash
   npm install
   ```
   or
   ```bash
   npm -i
   ```

3. **Start the development server:**

   This runs the application in development mode with hot-reloading:
   ```bash
   npm run dev
   ```

   The application will be available in your browser `http://localhost:5173`.

---

## Backend API Endpoints

### 1. User Profile

**Endpoint:** `POST /api/profile`

**Example Request:**
```json
{
  "username": "<username>",
  "avatar": {
    "skinColor": "#<hexa_code>",
    "eyeType": "<string>",
    "mouthType": "<string>"
  }
}
```

**Backend Requirements:**
- Handle duplicate usernames (reject or suggest alternative)
- Duplicate avatars are allowed
- Validate username (alphanumeric, 3-15 characters)

**Example Response:**
```json
{
  "success": true,
  "userId": "<unique_user_id>"
}
```

---

### 2. Create Room

**Endpoint:** `POST /api/rooms`

**Trigger:** When a player clicks "Create Room" button

**Example Request:**
```json
{
  "name": "<room_name>",
  "gameMode": "classic|speed|cooperative",
  "maxPlayers": 6,
  "host": "<username>",
  "playerCount": 1
}
```

**Backend Requirements:**
- Generate and return a unique `roomId`
- Store room in active rooms list
- Set creator as host (first player)
- Initialize playerCount to 1

**Example Response:**
```json
{
  "roomId": "<unique_room_id>"
}
```

---

### 3. Update Room (Real-time)

**Endpoint:** `PATCH /api/rooms/{roomId}/name`

**Trigger:** When host changes room name or settings (debounced 500ms)

**Example Request:**
```json
{
  "name": "<room_name>",
  "gameMode": "classic|speed|cooperative",
  "maxPlayers": 6,
  "host": "<username>",
  "playerCount": "<number>"
}
```

**Backend Requirements:**
- Verify that requester is the host
- Update room properties in database
- Broadcast changes to all players in room
- This is called frequently - handle efficiently

**Example Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "<room_id>",
    "name": "<room_name>",
    "gameMode": "<game_mode>",
    "playerCount": "<number>"
  }
}
```

---

### 4. Join Room

**Endpoint:** `POST /api/rooms/{roomId}/join`

**Trigger:** When a player clicks "Join" on an available room

**Example Request:**
```json
{
  "roomId": "<room_id>",
  "username": "<username>"
}
```

**Backend Requirements:**
- Check if room exists and is not full
- Add player to room's player list
- Increment playerCount
- Notify existing players in the room
- Return updated room data

**Example Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "<room_id>",
    "name": "<room_name>",
    "gameMode": "<game_mode>",
    "host": "<username>",
    "players": [
      { "id": 1, "name": "<username>", "isHost": true },
      { "id": 2, "name": "<username>", "isHost": false }
    ],
    "playerCount": "<number>",
    "maxPlayers": 6
  }
}
```

---

### 5. Leave Room

**Endpoint:** `POST /api/rooms/{roomId}/leave`

**Trigger:** When a player clicks "Back" button to exit the room

**Example Request:**
```json
{
  "roomId": "<room_id>",
  "username": "<username>",
  "isHost": true|false
}
```

**Backend Requirements:**
- Remove player from room's player list
- Decrement playerCount
- **If host leaves:**
  - If only player remaining: delete the room
  - If other players exist: assign new host (next player in list)
- Notify remaining players
- Clean up empty rooms

**Example Response:**
```json
{
  "success": true,
  "roomDeleted": true|false,
  "newHost": "<username>"
}
```

---

### 6. Start Game

**Endpoint:** `POST /api/rooms/{roomId}/start`

**Trigger:** When the host clicks "Start Game" button

**Example Request:**
```json
{
  "roomId": "<room_id>",
  "roomName": "<room_name>",
  "gameMode": "classic|speed|cooperative",
  "players": [
    { "id": 1, "name": "<username>", "isHost": true },
    { "id": 2, "name": "<username>", "isHost": false }
  ]
}
```

**Backend Requirements:**
- Verify requester is the host
- Require minimum 2 players to start
- Initialize game state (board, pieces, scores)
- Change room status to "in-game"
- Broadcast game start to all players
- Begin game loop

**Example Response:**
```json
{
  "success": true,
  "gameId": "<game_id>",
  "gameState": {
    "status": "starting",
    "players": [...],
    "countdown": 3
  }
}
```

---

## Game

### Warnings

When others add indestructible lines, wait until the player play its actual piece to add the indestructible lines. Otherwise, we will have visual problems such as glitches or vanishing pieces.

### Gamemodes

Classique
Speed
Cooperative
More to add
