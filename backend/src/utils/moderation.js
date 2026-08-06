/**
 * Lightweight, rules-based comment moderation.
 *
 * Honest scope: this is NOT an AI/LLM-based judge — it's keyword and pattern
 * heuristics. It intentionally errs toward flagging-for-human-review rather
 * than auto-deleting, because harassment/hate-speech detection done wrong
 * (false positives silencing legitimate criticism of officials, false
 * negatives letting real harassment through) has real consequences that a
 * simple keyword list can't safely resolve on its own.
 *
 * Flagged comments are hidden from public view but stored (not deleted) and
 * shown to officials in a review queue, who can approve or remove them.
 */

// Threat/violence indicators — kept intentionally narrow and non-exhaustive.
const THREAT_PATTERNS = [
  /\bkill (you|him|her|them)\b/i,
  /\bgonna (hurt|attack|beat)\b/i,
  /\bi will (hurt|attack|kill)\b/i,
  /\bburn (your|his|her|their) house\b/i,
  /\bshoot (you|him|her|them)\b/i
];

// Generic profanity — mild curse words only, not slurs. Flags for review,
// doesn't auto-delete, so borderline/contextual use isn't silently erased.
const PROFANITY_PATTERN = /\b(fuck|shit|bastard|asshole|bitch)\b/i;

function isSpammyRepetition(text) {
  // Same character repeated 6+ times (e.g. "!!!!!!!!" or "aaaaaaaa")
  if (/(.)\1{5,}/.test(text)) return true;
  // Mostly uppercase and reasonably long — shouting pattern
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 15) {
    const upperRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
    if (upperRatio > 0.8) return true;
  }
  return false;
}

function moderateComment(text) {
  if (THREAT_PATTERNS.some(p => p.test(text))) {
    return { flagged: true, reason: 'possible_threat' };
  }
  if (PROFANITY_PATTERN.test(text)) {
    return { flagged: true, reason: 'profanity' };
  }
  if (isSpammyRepetition(text)) {
    return { flagged: true, reason: 'spam_pattern' };
  }
  return { flagged: false, reason: null };
}

module.exports = { moderateComment };