import { pb } from './client';
import type { Song, CreateSongData, UpdateSongData } from '$lib/types/song';

export class SongsAPI {
  private collection = 'songs';

  /**
   * Get all active songs
   */
  async getSongs(): Promise<Song[]> {
    try {
      const records = await pb.collection(this.collection).getFullList({
        filter: 'is_active = true',
        sort: '-created',
        expand: 'created_by'
      });
      return records as Song[];
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      throw error;
    }
  }

  /**
   * Get songs that haven't been used recently
   */
  async getAvailableSongs(weeksToCheck = 4): Promise<Song[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeksToCheck * 7));
    
    try {
      // First, get recently used song IDs
      const recentUsage = await pb.collection('song_usage').getFullList({
        filter: `usage_date >= "${cutoffDate.toISOString()}"`,
        fields: 'song'
      });
      
      const recentSongIds = recentUsage.map(u => u.song);
      
      // Build filter to exclude recently used songs
      let filterQuery = 'is_active = true';
      if (recentSongIds.length > 0) {
        const excludeFilter = recentSongIds.map(id => `id != "${id}"`).join(' && ');
        filterQuery += ` && (${excludeFilter})`;
      }
      
      // Fetch available songs
      const availableSongs = await pb.collection(this.collection).getFullList({
        filter: filterQuery,
        expand: 'song_usage_via_song',
        sort: '-created'
      });
      
      return availableSongs as Song[];
    } catch (error) {
      console.error('Failed to fetch available songs:', error);
      throw error;
    }
  }

  /**
   * Get a single song by ID
   */
  async getSong(id: string): Promise<Song> {
    try {
      const record = await pb.collection(this.collection).getOne(id, {
        expand: 'created_by'
      });
      return record as Song;
    } catch (error) {
      console.error('Failed to fetch song:', error);
      throw error;
    }
  }

  /**
   * Create a new song
   */
  async createSong(data: CreateSongData): Promise<Song> {
    try {
      const record = await pb.collection(this.collection).create({
        ...data,
        created_by: pb.authStore.model?.id,
        is_active: true
      });
      return record as Song;
    } catch (error) {
      console.error('Failed to create song:', error);
      throw error;
    }
  }

  /**
   * Update an existing song
   */
  async updateSong(id: string, data: UpdateSongData): Promise<Song> {
    try {
      const record = await pb.collection(this.collection).update(id, data);
      return record as Song;
    } catch (error) {
      console.error('Failed to update song:', error);
      throw error;
    }
  }

  /**
   * Delete a song (soft delete by setting is_active to false)
   */
  async deleteSong(id: string): Promise<void> {
    try {
      await pb.collection(this.collection).update(id, { is_active: false });
    } catch (error) {
      console.error('Failed to delete song:', error);
      throw error;
    }
  }

  /**
   * Search songs by title or artist
   */
  async searchSongs(query: string): Promise<Song[]> {
    try {
      const filter = `is_active = true && (title ~ "${query}" || artist ~ "${query}")`;
      const records = await pb.collection(this.collection).getFullList({
        filter,
        sort: '-created',
        expand: 'created_by'
      });
      return records as Song[];
    } catch (error) {
      console.error('Failed to search songs:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for songs
   */
  subscribe(callback: (data: any) => void) {
    return pb.collection(this.collection).subscribe('*', callback);
  }
}

// Export singleton instance
export const songsApi = new SongsAPI();