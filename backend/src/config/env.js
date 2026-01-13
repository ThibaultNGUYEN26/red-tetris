import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

console.log("ENV LOADED:", {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
});
