import { initCounter } from "./components/counter.js";
import { initTrack } from "./components/track.js";
import { initProjects } from "./components/projects.js";

// Приветствие по местному времени пользователя
const hour = new Date().getHours();
const greeting =
  hour >= 5 && hour < 12 ? "Good morning!"
  : hour >= 12 && hour < 18 ? "Good afternoon!"
  : hour >= 18 && hour < 23 ? "Good evening!"
  : "Good night!";
document.getElementById("greeting").textContent = greeting;

initCounter();
initTrack();
initProjects();
