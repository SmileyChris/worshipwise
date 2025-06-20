/**
 * Service-related utility functions
 */

import type { ServiceSong } from '$lib/types/service';

/**
 * Service section types
 */
export const SECTION_TYPES = [
  'Opening',
  'Call to Worship',
  'Praise & Worship',
  'Intercession',
  'Offering',
  'Communion',
  'Response',
  'Closing',
  'Special Music'
] as const;

/**
 * Calculates total duration of a service in seconds
 */
export function calculateServiceDuration(songs: ServiceSong[]): number {
  return songs.reduce((total, song) => {
    // Use duration override if available, otherwise use song's default duration
    const duration = song.duration_override || song.expand?.song_id?.duration_seconds || 0;
    return total + duration;
  }, 0);
}

/**
 * Formats duration from seconds to "MM:SS" format
 */
export function formatServiceDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats duration from seconds to "X minutes" or "X hours Y minutes" format
 */
export function formatServiceDurationLong(seconds: number): string {
  if (seconds <= 0) return '0 minutes';
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Reorders songs in a service based on drag and drop
 */
export function reorderSongs<T extends { id: string }>(
  songs: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
      fromIndex >= songs.length || toIndex >= songs.length) {
    return songs;
  }
  
  const newSongs = [...songs];
  const [movedSong] = newSongs.splice(fromIndex, 1);
  newSongs.splice(toIndex, 0, movedSong);
  
  return newSongs;
}

/**
 * Generates order mapping for reordered songs
 */
export function generateOrderMapping(songs: Array<{ id: string }>): Array<{ id: string; position: number }> {
  return songs.map((song, index) => ({
    id: song.id,
    position: index
  }));
}

/**
 * Checks for scheduling conflicts between services
 */
export function checkSchedulingConflicts(
  newDate: string,
  newServiceType: string,
  existingServices: Array<{ service_date: string; service_type?: string; id?: string }>,
  excludeId?: string
): { hasConflict: boolean; conflictMessage?: string } {
  const conflicts = existingServices.filter(service => {
    // Skip the service being edited
    if (excludeId && service.id === excludeId) return false;
    
    // Check for same date and service type
    return service.service_date === newDate && service.service_type === newServiceType;
  });
  
  if (conflicts.length > 0) {
    return {
      hasConflict: true,
      conflictMessage: `A ${newServiceType} service is already scheduled for ${newDate}`
    };
  }
  
  return { hasConflict: false };
}

/**
 * Validates service data
 */
export function validateServiceData(data: {
  title: string;
  service_date: string;
  estimated_duration?: number;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  // Validate title
  if (!data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }
  
  // Validate service date
  if (!data.service_date) {
    errors.service_date = 'Service date is required';
  } else {
    const serviceDate = new Date(data.service_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (serviceDate < today) {
      errors.service_date = 'Service date cannot be in the past';
    }
  }
  
  // Validate estimated duration
  if (data.estimated_duration !== undefined) {
    if (data.estimated_duration < 10 || data.estimated_duration > 480) {
      errors.estimated_duration = 'Duration must be between 10 minutes and 8 hours';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Groups service songs by section type
 */
export function groupSongsBySection(songs: ServiceSong[]): Record<string, ServiceSong[]> {
  return songs.reduce((groups, song) => {
    const section = song.section_type || 'Uncategorized';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(song);
    return groups;
  }, {} as Record<string, ServiceSong[]>);
}

/**
 * Calculates section duration
 */
export function calculateSectionDuration(songs: ServiceSong[]): number {
  return calculateServiceDuration(songs);
}

/**
 * Finds the optimal insertion position for a new song
 */
export function findOptimalInsertionPosition(
  songs: ServiceSong[],
  sectionType: string
): number {
  // Find the last song of the same section type
  for (let i = songs.length - 1; i >= 0; i--) {
    if (songs[i].section_type === sectionType) {
      return i + 1;
    }
  }
  
  // If no songs of this section type exist, find the appropriate position
  // based on the standard service flow
  const sectionOrder = SECTION_TYPES.indexOf(sectionType as any);
  
  for (let i = 0; i < songs.length; i++) {
    const currentSectionOrder = SECTION_TYPES.indexOf(songs[i].section_type as any);
    if (currentSectionOrder > sectionOrder) {
      return i;
    }
  }
  
  // If no appropriate position found, append at the end
  return songs.length;
}

/**
 * Generates a service PDF export data structure
 */
export function generateServicePDFData(service: any, songs: ServiceSong[]) {
  const sections = groupSongsBySection(songs);
  const totalDuration = calculateServiceDuration(songs);
  
  return {
    title: service.title,
    date: service.service_date,
    serviceType: service.service_type,
    theme: service.theme,
    worshipLeader: service.expand?.worship_leader?.name || 'Unknown',
    totalDuration: formatServiceDurationLong(totalDuration),
    sections: Object.entries(sections).map(([sectionName, sectionSongs]) => ({
      name: sectionName,
      duration: formatServiceDurationLong(calculateSectionDuration(sectionSongs)),
      songs: sectionSongs.map(song => ({
        title: song.expand?.song_id?.title || 'Unknown Song',
        artist: song.expand?.song_id?.artist || '',
        key: song.transposed_key || song.expand?.song_id?.key_signature || '',
        tempo: song.tempo_override || song.expand?.song_id?.tempo || '',
        notes: song.transition_notes || ''
      }))
    }))
  };
}

/**
 * Validates song ordering for logical service flow
 */
export function validateServiceFlow(songs: ServiceSong[]): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (songs.length === 0) {
    return { isValid: true, warnings, suggestions };
  }
  
  // Check for typical service flow
  const sections = songs.map(song => song.section_type);
  const hasOpening = sections.includes('Opening');
  const hasClosing = sections.includes('Closing');
  const hasPraise = sections.includes('Praise & Worship');
  
  // Suggestions for better flow
  if (!hasOpening && songs.length > 0) {
    suggestions.push('Consider adding an opening song to start the service');
  }
  
  if (!hasClosing && songs.length > 2) {
    suggestions.push('Consider adding a closing song to end the service');
  }
  
  if (!hasPraise && songs.length > 1) {
    suggestions.push('Consider adding praise & worship songs for congregational singing');
  }
  
  // Check for very long or very short services
  const totalDuration = calculateServiceDuration(songs);
  if (totalDuration > 7200) { // 2 hours
    warnings.push('Service duration is very long (over 2 hours)');
  } else if (totalDuration < 900 && songs.length > 2) { // 15 minutes
    warnings.push('Service duration might be too short');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}