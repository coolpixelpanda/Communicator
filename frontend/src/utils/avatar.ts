/**
 * Deterministic avatar color from a username string.
 * Produces Slack-style muted pastels that work well as avatar backgrounds.
 */
const AVATAR_COLORS = [
  "bg-red-600",
  "bg-orange-600",
  "bg-amber-600",
  "bg-yellow-600",
  "bg-lime-600",
  "bg-green-600",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-sky-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-purple-600",
  "bg-fuchsia-600",
  "bg-pink-600",
  "bg-rose-600",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export function getAvatarColor(username: string): string {
  return AVATAR_COLORS[hash(username) % AVATAR_COLORS.length];
}

export function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
