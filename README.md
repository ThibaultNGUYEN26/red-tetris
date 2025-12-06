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

## Receive User Profile in the backend

Here you will recieve the profile with 2 inputs: username and avatar.
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
You need to handle the duplicate username.
Keep duplicate avatars.

---

## Game

When others add indestructible lines, wait until the player play its actual piece to add the indestructible lines. Otherwise, we will have visual problems such as glitches or vanishing pieces.


