// Встроенный снимок списка репозиториев — последний запасной вариант, когда
// GitHub API недоступен (лимит 60 запросов/час без токена) и нет сервера.
// Обычный <script>, а не JSON, чтобы читаться при открытии через file://.
// Обновлять при необходимости из data/github-cache.json.
window.SITE_SNAPSHOT = {
  projects: [
    {
      name: "dem0rg-site",
      url: "https://github.com/dem0rg-official/dem0rg-site",
      description: "Персональный сайт-портфолио DeM0RG",
      date: "2026-11-10T17:57:30Z",
      status: "public",
      fork: false,
    },
    {
      name: "liveSubtitles-Omarchy",
      url: "https://github.com/dem0rg-official/liveSubtitles-Omarchy",
      description: "Offline real-time subtitles for Omarchy/Hyprland: system-audio capture → streaming Whisper/zipformer STT → Argos translation → Quickshell layer-shell overlay",
      date: "2026-11-04T18:49:10Z",
      status: "public",
      fork: false,
    },
    {
      name: "inscape-skill",
      url: "https://github.com/dem0rg-official/inscape-skill",
      description: "Claude Code skill: calm, non-emotional reply drafts and situation breakdowns for conflicts (chat/email correspondence)",
      date: "2026-10-15T18:25:27Z",
      status: "public",
      fork: false,
    },
  ],
};
