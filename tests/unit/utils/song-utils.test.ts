import { describe, it, expect } from 'vitest';
import {
  KEY_SIGNATURE_OPTIONS,
  validateSongTitle,
  validateTempo,
  validateDuration,
  formatDuration,
  convertDurationToSeconds,
  convertSecondsToMinutesAndSeconds,
  parseTags,
  formatTags,
  transposeKey,
  calculateUsageIndicator,
  getUsageIndicatorMessage,
  validateSongData
} from '$lib/utils/song-utils';

describe('Song Utils', () => {
  describe('KEY_SIGNATURE_OPTIONS', () => {
    it('should contain all major and minor keys', () => {
      expect(KEY_SIGNATURE_OPTIONS).toHaveLength(34);
      
      // Check for some major keys
      expect(KEY_SIGNATURE_OPTIONS.some(k => k.value === 'C')).toBe(true);
      expect(KEY_SIGNATURE_OPTIONS.some(k => k.value === 'G')).toBe(true);
      
      // Check for some minor keys
      expect(KEY_SIGNATURE_OPTIONS.some(k => k.value === 'Am')).toBe(true);
      expect(KEY_SIGNATURE_OPTIONS.some(k => k.value === 'Em')).toBe(true);
    });
  });

  describe('validateSongTitle', () => {
    it('should pass for valid titles', () => {
      const result = validateSongTitle('Amazing Grace');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should fail for empty titles', () => {
      const result = validateSongTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should fail for whitespace-only titles', () => {
      const result = validateSongTitle('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should fail for titles over 200 characters', () => {
      const longTitle = 'a'.repeat(201);
      const result = validateSongTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title must be less than 200 characters');
    });

    it('should pass for titles exactly 200 characters', () => {
      const exactTitle = 'a'.repeat(200);
      const result = validateSongTitle(exactTitle);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });
  });

  describe('validateTempo', () => {
    it('should pass for empty tempo', () => {
      const result = validateTempo('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should pass for valid tempo', () => {
      const result = validateTempo('120');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should fail for non-numeric tempo', () => {
      const result = validateTempo('fast');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tempo must be a number');
    });

    it('should fail for tempo below 60', () => {
      const result = validateTempo('50');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tempo must be between 60 and 200 BPM');
    });

    it('should fail for tempo above 200', () => {
      const result = validateTempo('250');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tempo must be between 60 and 200 BPM');
    });

    it('should pass for boundary values', () => {
      expect(validateTempo('60').isValid).toBe(true);
      expect(validateTempo('200').isValid).toBe(true);
    });
  });

  describe('validateDuration', () => {
    it('should pass for empty duration', () => {
      const result = validateDuration('', '');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should pass for valid duration', () => {
      const result = validateDuration('3', '30');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should fail for negative values', () => {
      const result = validateDuration('-1', '30');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid duration');
    });

    it('should fail for seconds >= 60', () => {
      const result = validateDuration('3', '60');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid duration');
    });

    it('should fail for duration under 30 seconds', () => {
      const result = validateDuration('0', '20');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duration must be between 30 seconds and 30 minutes');
    });

    it('should fail for duration over 30 minutes', () => {
      const result = validateDuration('31', '0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duration must be between 30 seconds and 30 minutes');
    });

    it('should pass for boundary values', () => {
      expect(validateDuration('0', '30').isValid).toBe(true);
      expect(validateDuration('30', '0').isValid).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('should format zero duration', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('0:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2:05');
    });

    it('should pad single digit seconds', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should handle negative values', () => {
      expect(formatDuration(-10)).toBe('0:00');
    });
  });

  describe('convertDurationToSeconds', () => {
    it('should return undefined for empty values', () => {
      expect(convertDurationToSeconds('', '')).toBeUndefined();
    });

    it('should convert minutes only', () => {
      expect(convertDurationToSeconds('3', '')).toBe(180);
    });

    it('should convert seconds only', () => {
      expect(convertDurationToSeconds('', '45')).toBe(45);
    });

    it('should convert minutes and seconds', () => {
      expect(convertDurationToSeconds('3', '30')).toBe(210);
    });

    it('should handle string conversion', () => {
      expect(convertDurationToSeconds('2', '15')).toBe(135);
    });
  });

  describe('convertSecondsToMinutesAndSeconds', () => {
    it('should convert seconds only', () => {
      const result = convertSecondsToMinutesAndSeconds(45);
      expect(result).toEqual({ minutes: '0', seconds: '45' });
    });

    it('should convert minutes and seconds', () => {
      const result = convertSecondsToMinutesAndSeconds(125);
      expect(result).toEqual({ minutes: '2', seconds: '5' });
    });

    it('should handle exact minutes', () => {
      const result = convertSecondsToMinutesAndSeconds(180);
      expect(result).toEqual({ minutes: '3', seconds: '0' });
    });
  });

  describe('parseTags', () => {
    it('should parse comma-separated tags', () => {
      const result = parseTags('tag1, tag2, tag3');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should trim whitespace', () => {
      const result = parseTags('  tag1  ,  tag2  ');
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('should filter empty tags', () => {
      const result = parseTags('tag1, , tag2, ');
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('should handle empty input', () => {
      const result = parseTags('');
      expect(result).toEqual([]);
    });
  });

  describe('formatTags', () => {
    it('should format tags with commas', () => {
      const result = formatTags(['tag1', 'tag2', 'tag3']);
      expect(result).toBe('tag1, tag2, tag3');
    });

    it('should handle empty array', () => {
      const result = formatTags([]);
      expect(result).toBe('');
    });

    it('should handle single tag', () => {
      const result = formatTags(['tag1']);
      expect(result).toBe('tag1');
    });
  });

  describe('transposeKey', () => {
    it('should transpose major keys up', () => {
      expect(transposeKey('C', 2)).toBe('D');
      expect(transposeKey('G', 5)).toBe('C');
    });

    it('should transpose major keys down', () => {
      expect(transposeKey('D', -2)).toBe('C');
      expect(transposeKey('C', -5)).toBe('G');
    });

    it('should transpose minor keys', () => {
      expect(transposeKey('Am', 2)).toBe('Bm');
      expect(transposeKey('Em', -2)).toBe('Dm');
    });

    it('should handle enharmonic equivalents', () => {
      expect(transposeKey('Db', 0)).toBe('C#');
      expect(transposeKey('Bb', 1)).toBe('B');
    });

    it('should handle wrapping around chromatic scale', () => {
      expect(transposeKey('B', 1)).toBe('C');
      expect(transposeKey('C', -1)).toBe('B');
    });

    it('should handle empty key', () => {
      expect(transposeKey('', 2)).toBe('');
    });

    it('should handle invalid key', () => {
      expect(transposeKey('X', 2)).toBe('X');
    });
  });

  describe('calculateUsageIndicator', () => {
    it('should return green for never used songs', () => {
      const result = calculateUsageIndicator(undefined, 0);
      expect(result).toBe('green');
    });

    it('should return red for recently used songs', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = calculateUsageIndicator(yesterday.toISOString(), 1, 30);
      expect(result).toBe('red');
    });

    it('should return yellow for frequently used but not recent songs', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      const result = calculateUsageIndicator(twoMonthsAgo.toISOString(), 5, 30);
      expect(result).toBe('yellow');
    });

    it('should return green for infrequently used old songs', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      const result = calculateUsageIndicator(twoMonthsAgo.toISOString(), 1, 30);
      expect(result).toBe('green');
    });
  });

  describe('getUsageIndicatorMessage', () => {
    it('should return appropriate message for never used', () => {
      const result = getUsageIndicatorMessage('green');
      expect(result).toBe('Never used');
    });

    it('should return appropriate message for ready to use', () => {
      const result = getUsageIndicatorMessage('green', 45);
      expect(result).toBe('Ready to use');
    });

    it('should return appropriate message for frequent use', () => {
      const result = getUsageIndicatorMessage('yellow', 45);
      expect(result).toBe('Used frequently - last used 45 days ago');
    });

    it('should return appropriate message for recent use', () => {
      const result = getUsageIndicatorMessage('red', 5);
      expect(result).toBe('Recently used - 5 days ago');
    });
  });

  describe('validateSongData', () => {
    it('should validate complete valid data', () => {
      const data = {
        title: 'Amazing Grace',
        tempo: '120',
        durationMinutes: '3',
        durationSeconds: '30'
      };
      
      const result = validateSongData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid data', () => {
      const data = {
        title: '',
        tempo: '300',
        durationMinutes: '0',
        durationSeconds: '10'
      };
      
      const result = validateSongData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Title is required');
      expect(result.errors.tempo).toBe('Tempo must be between 60 and 200 BPM');
      expect(result.errors.duration).toBe('Duration must be between 30 seconds and 30 minutes');
    });

    it('should validate minimal valid data', () => {
      const data = {
        title: 'Song Title'
      };
      
      const result = validateSongData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});