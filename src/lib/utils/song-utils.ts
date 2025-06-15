/**
 * Song-related utility functions
 */

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

/**
 * Key signature options for songs
 */
export const KEY_SIGNATURE_OPTIONS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C#' },
  { value: 'Db', label: 'Db' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'D#' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#' },
  { value: 'Gb', label: 'Gb' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'G#' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'A#' },
  { value: 'Bb', label: 'Bb' },
  { value: 'B', label: 'B' },
  { value: 'Cm', label: 'Cm' },
  { value: 'C#m', label: 'C#m' },
  { value: 'Dbm', label: 'Dbm' },
  { value: 'Dm', label: 'Dm' },
  { value: 'D#m', label: 'D#m' },
  { value: 'Ebm', label: 'Ebm' },
  { value: 'Em', label: 'Em' },
  { value: 'Fm', label: 'Fm' },
  { value: 'F#m', label: 'F#m' },
  { value: 'Gbm', label: 'Gbm' },
  { value: 'Gm', label: 'Gm' },
  { value: 'G#m', label: 'G#m' },
  { value: 'Abm', label: 'Abm' },
  { value: 'Am', label: 'Am' },
  { value: 'A#m', label: 'A#m' },
  { value: 'Bbm', label: 'Bbm' },
  { value: 'Bm', label: 'Bm' }
] as const;

/**
 * Validates a song title
 */
export function validateSongTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Title is required' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Title must be less than 200 characters' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Validates tempo (BPM)
 */
export function validateTempo(tempo: string): ValidationResult {
  if (!tempo.trim()) {
    return { isValid: true, error: '' };
  }
  
  const num = parseInt(tempo);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Tempo must be a number' };
  }
  
  if (num < 60 || num > 200) {
    return { isValid: false, error: 'Tempo must be between 60 and 200 BPM' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Validates song duration
 */
export function validateDuration(minutes: string, seconds: string): ValidationResult {
  if (!minutes && !seconds) {
    return { isValid: true, error: '' };
  }
  
  const minutesNum = parseInt(minutes) || 0;
  const secondsNum = parseInt(seconds) || 0;
  
  if (minutesNum < 0 || secondsNum < 0 || secondsNum >= 60) {
    return { isValid: false, error: 'Please enter a valid duration' };
  }
  
  const totalSeconds = minutesNum * 60 + secondsNum;
  
  if (totalSeconds < 30 || totalSeconds > 1800) {
    return { isValid: false, error: 'Duration must be between 30 seconds and 30 minutes' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Formats duration from seconds to "MM:SS" format
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Converts duration from minutes and seconds strings to total seconds
 */
export function convertDurationToSeconds(minutes: string, seconds: string): number | undefined {
  if (!minutes && !seconds) return undefined;
  
  const minutesNum = parseInt(minutes) || 0;
  const secondsNum = parseInt(seconds) || 0;
  
  return minutesNum * 60 + secondsNum;
}

/**
 * Converts duration from seconds to minutes and seconds
 */
export function convertSecondsToMinutesAndSeconds(totalSeconds: number): { minutes: string; seconds: string } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return {
    minutes: minutes.toString(),
    seconds: seconds.toString()
  };
}

/**
 * Parses tags from comma-separated string
 */
export function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Formats tags array to comma-separated string
 */
export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Key transposition utilities
 */
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};

/**
 * Transposes a key by a given number of semitones
 */
export function transposeKey(key: string, semitones: number): string {
  if (!key) return '';
  
  // Handle minor keys
  const isMinor = key.endsWith('m');
  const baseKey = isMinor ? key.slice(0, -1) : key;
  
  // Normalize enharmonic equivalents
  const normalizedKey = ENHARMONIC_MAP[baseKey] || baseKey;
  
  // Find the index in the chromatic scale
  const currentIndex = CHROMATIC_SCALE.indexOf(normalizedKey);
  if (currentIndex === -1) return key; // Invalid key, return as-is
  
  // Calculate new index (with wrapping)
  const newIndex = ((currentIndex + semitones) % 12 + 12) % 12;
  const newKey = CHROMATIC_SCALE[newIndex];
  
  return isMinor ? newKey + 'm' : newKey;
}

/**
 * Calculates usage indicator based on last usage date and count
 */
export function calculateUsageIndicator(
  lastUsedDate?: string,
  usageCount: number = 0,
  daysSinceThreshold: number = 30
): 'green' | 'yellow' | 'red' {
  if (!lastUsedDate) {
    return 'green'; // Never used
  }
  
  const lastUsed = new Date(lastUsedDate);
  const now = new Date();
  const daysSinceLastUsed = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
  
  // Red: Used recently (within threshold days)
  if (daysSinceLastUsed < daysSinceThreshold) {
    return 'red';
  }
  
  // Yellow: Used multiple times but not recently
  if (usageCount >= 3) {
    return 'yellow';
  }
  
  // Green: Safe to use
  return 'green';
}

/**
 * Gets usage indicator message
 */
export function getUsageIndicatorMessage(
  indicator: 'green' | 'yellow' | 'red',
  daysSinceLastUsed?: number
): string {
  switch (indicator) {
    case 'green':
      return daysSinceLastUsed ? 'Ready to use' : 'Never used';
    case 'yellow':
      return `Used frequently - last used ${daysSinceLastUsed} days ago`;
    case 'red':
      return `Recently used - ${daysSinceLastUsed} days ago`;
    default:
      return '';
  }
}

/**
 * Validates song data comprehensively
 */
export function validateSongData(data: {
  title: string;
  tempo?: string;
  durationMinutes?: string;
  durationSeconds?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  const titleValidation = validateSongTitle(data.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error;
  }
  
  if (data.tempo) {
    const tempoValidation = validateTempo(data.tempo);
    if (!tempoValidation.isValid) {
      errors.tempo = tempoValidation.error;
    }
  }
  
  if (data.durationMinutes || data.durationSeconds) {
    const durationValidation = validateDuration(data.durationMinutes || '', data.durationSeconds || '');
    if (!durationValidation.isValid) {
      errors.duration = durationValidation.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}