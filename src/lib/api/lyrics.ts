interface LyricsSearchResult {
	title: string;
	artist?: string;
	lyrics: string;
	source: string;
	url?: string;
}

interface SearchEngine {
	name: string;
	search: (query: string) => Promise<LyricsSearchResult | null>;
}

export class LyricsSearchClient {
	private searchEngines: SearchEngine[] = [];

	constructor() {
		// Initialize search engines in order of preference
		this.searchEngines = [
			{
				name: 'WorshipLeaderFinder',
				search: this.searchWorshipLeader.bind(this)
			},
			{
				name: 'ChristianLyricsFinder',
				search: this.searchChristianSites.bind(this)
			},
			{
				name: 'GeneralSearch',
				search: this.searchGeneral.bind(this)
			}
		];
	}

	async searchLyrics(title: string, artist?: string): Promise<LyricsSearchResult | null> {
		const searchQuery = artist ? `${title} ${artist} lyrics` : `${title} lyrics`;

		// Try each search engine in sequence
		for (const engine of this.searchEngines) {
			try {
				const result = await engine.search(searchQuery);
				if (result && result.lyrics.trim().length > 0) {
					return result;
				}
			} catch (error) {
				console.warn(`${engine.name} search failed:`, error);
				// Continue to next search engine
			}
		}

		// If no results found
		return null;
	}

	private async searchWorshipLeader(query: string): Promise<LyricsSearchResult | null> {
		// Search for worship-specific terms and sites
		const worshipQuery = `${query} worship song christian`;

		// Use DuckDuckGo Instant Answer API (CORS-friendly)
		try {
			const response = await fetch(
				`https://api.duckduckgo.com/?q=${encodeURIComponent(worshipQuery)}&format=json&no_html=1&skip_disambig=1`,
				{
					method: 'GET',
					headers: {
						Accept: 'application/json'
					}
				}
			);

			if (!response.ok) {
				throw new Error(`Search failed: ${response.status}`);
			}

			const data = await response.json();

			// Look for relevant results in the response
			if (data.AbstractText && data.AbstractText.length > 100) {
				// Sometimes DuckDuckGo returns lyrics in abstract text
				return {
					title: query.replace(' lyrics', '').replace(' worship song christian', ''),
					lyrics: data.AbstractText,
					source: 'DuckDuckGo',
					url: data.AbstractURL
				};
			}

			// Check related topics for lyrics
			if (data.RelatedTopics && data.RelatedTopics.length > 0) {
				for (const topic of data.RelatedTopics) {
					if (topic.Text && topic.Text.length > 100 && topic.Text.includes('verse')) {
						return {
							title: query.replace(' lyrics', '').replace(' worship song christian', ''),
							lyrics: topic.Text,
							source: 'DuckDuckGo Related',
							url: topic.FirstURL
						};
					}
				}
			}

			return null;
		} catch (error) {
			console.error('DuckDuckGo search error:', error);
			return null;
		}
	}

	private async searchChristianSites(query: string): Promise<LyricsSearchResult | null> {
		// Search specifically targeting Christian lyrics sites
		const christianQuery = `${query} site:hymnary.org OR site:cyberhymnal.org OR site:songlyrics.com`;

		try {
			// Use a CORS proxy service for web scraping
			const proxyUrl = 'https://api.allorigins.win/get?url=';
			const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(christianQuery)}`;

			const response = await fetch(proxyUrl + encodeURIComponent(searchUrl));

			if (!response.ok) {
				throw new Error(`Proxy request failed: ${response.status}`);
			}

			const data = await response.json();
			const html = data.contents;

			// Parse the HTML response to find lyrics links
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// Look for links to known lyrics sites
			const links = doc.querySelectorAll('a[href*="hymnary.org"], a[href*="cyberhymnal.org"]');

			for (const link of Array.from(links).slice(0, 3)) {
				// Try first 3 links
				const href = link.getAttribute('href');
				if (href) {
					try {
						const lyricsContent = await this.fetchLyricsFromUrl(href);
						if (lyricsContent) {
							return {
								title: query.replace(' lyrics', ''),
								lyrics: lyricsContent,
								source: 'Christian Sites',
								url: href
							};
						}
					} catch (error) {
						console.warn('Failed to fetch from link:', href, error);
						continue;
					}
				}
			}

			return null;
		} catch (error) {
			console.error('Christian sites search error:', error);
			return null;
		}
	}

	private async searchGeneral(query: string): Promise<LyricsSearchResult | null> {
		// Fallback to general web search with lyrics keywords
		const generalQuery = `${query} christian hymn song lyrics`;

		try {
			// Use a different approach - search for structured data
			const response = await fetch(
				`https://api.duckduckgo.com/?q=${encodeURIComponent(generalQuery)}&format=json&no_html=1&skip_disambig=1`
			);

			if (!response.ok) {
				return null;
			}

			const data = await response.json();

			// Look for infobox or definition that might contain lyrics
			if (data.Definition && data.Definition.length > 50) {
				return {
					title: query.replace(' christian hymn song lyrics', ''),
					lyrics: data.Definition,
					source: 'General Search',
					url: data.DefinitionURL
				};
			}

			// Check answer if available
			if (data.Answer && data.Answer.length > 50) {
				return {
					title: query.replace(' christian hymn song lyrics', ''),
					lyrics: data.Answer,
					source: 'General Search Answer'
				};
			}

			return null;
		} catch (error) {
			console.error('General search error:', error);
			return null;
		}
	}

	private async fetchLyricsFromUrl(url: string): Promise<string | null> {
		try {
			// Use CORS proxy to fetch content from URL
			const proxyUrl = 'https://api.allorigins.win/get?url=';
			const response = await fetch(proxyUrl + encodeURIComponent(url));

			if (!response.ok) {
				return null;
			}

			const data = await response.json();
			const html = data.contents;

			// Extract lyrics from HTML using common patterns
			return this.extractLyricsFromHTML(html);
		} catch (error) {
			console.error('Failed to fetch lyrics from URL:', url, error);
			return null;
		}
	}

	private extractLyricsFromHTML(html: string): string | null {
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// Remove non-content elements
			const elementsToRemove = doc.querySelectorAll(
				'script, style, nav, header, footer, aside, .ads, .advertisement'
			);
			elementsToRemove.forEach((el) => el.remove());

			// Common lyrics selectors
			const lyricsSelectors = [
				'[class*="lyrics"]',
				'[class*="song-text"]',
				'[class*="verse"]',
				'[id*="lyrics"]',
				'.content',
				'.main-content',
				'pre',
				'[class*="hymn-text"]'
			];

			for (const selector of lyricsSelectors) {
				const elements = doc.querySelectorAll(selector);
				for (const element of elements) {
					const text = element.textContent?.trim() || '';
					if (text.length > 100 && this.looksLikeLyrics(text)) {
						return this.cleanLyricsText(text);
					}
				}
			}

			// Fallback: look for any element with substantial text that looks like lyrics
			const allElements = doc.querySelectorAll('p, div');
			for (const element of allElements) {
				const text = element.textContent?.trim() || '';
				if (text.length > 100 && this.looksLikeLyrics(text)) {
					return this.cleanLyricsText(text);
				}
			}

			return null;
		} catch (error) {
			console.error('Failed to extract lyrics from HTML:', error);
			return null;
		}
	}

	private looksLikeLyrics(text: string): boolean {
		// Heuristics to determine if text looks like song lyrics
		const lyricsKeywords = [
			'verse',
			'chorus',
			'bridge',
			'refrain',
			'stanza',
			'hallelujah',
			'praise',
			'lord',
			'god',
			'jesus',
			'christ',
			'worship',
			'sing',
			'glory',
			'holy',
			'amen'
		];

		const lowerText = text.toLowerCase();
		const keywordCount = lyricsKeywords.filter((keyword) => lowerText.includes(keyword)).length;

		// Check for line breaks (typical in lyrics)
		const lineBreaks = (text.match(/\n/g) || []).length;

		// Check for repeated patterns (verse/chorus structure)
		const hasStructure = /verse|chorus|bridge|refrain/i.test(text);

		return keywordCount >= 2 || lineBreaks >= 5 || hasStructure;
	}

	private cleanLyricsText(text: string): string {
		// Clean up extracted lyrics text
		return text
			.replace(/\s+/g, ' ') // Normalize whitespace
			.replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
			.replace(/^\s+|\s+$/g, '') // Trim
			.replace(/\[.*?\]/g, '') // Remove chord annotations
			.replace(/\(.*?\)/g, '') // Remove parenthetical notes
			.trim();
	}
}

// Factory function for creating lyrics search client
export function createLyricsSearchClient(): LyricsSearchClient {
	return new LyricsSearchClient();
}

// Helper function to validate if text looks like meaningful lyrics
export function validateLyricsContent(lyrics: string): boolean {
	if (!lyrics || lyrics.trim().length < 50) {
		return false;
	}

	// Check for minimum structure
	const lines = lyrics.split('\n').filter((line) => line.trim().length > 0);
	if (lines.length < 4) {
		return false;
	}

	return true;
}
