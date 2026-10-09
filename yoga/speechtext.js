// Shared (browser + build script): how coach lines are split into sentences and mapped to voice clips.
const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu;
export const stripEmoji = t => String(t).replace(EMOJI, '').replace(/\s+/g, ' ').trim();
export function sentences(text) { return stripEmoji(text).split(/(?<=[.!?…])\s+(?=\S)/).map(s => s.trim()).filter(Boolean); }
export function norm(s) { return stripEmoji(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
export function clipId(s) { const n = norm(s); let h = 0x811c9dc5; for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
