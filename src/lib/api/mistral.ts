import type { LyricsAnalysis } from '$lib/types/song';

interface MistralAPIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

interface MistralAPIError {
	error: {
		message: string;
		type: string;
		code?: string;
	};
}

export class MistralClient {
	private apiKey: string;
	private baseURL = 'https://api.mistral.ai/v1/chat/completions';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private getAnalysisPrompt(title: string, artist: string | undefined, lyrics: string): string {
		return `You are a worship planning assistant. Analyze the following song lyrics and provide a structured JSON response with worship insights.

Song: "${title}"${artist ? ` by ${artist}` : ''}

Lyrics:
${lyrics}

Provide analysis in this exact JSON format:
{
  "title": "${title}",
  "artist": ${artist ? `"${artist}"` : 'null'},
  "themes": ["array of 3-5 main worship themes like praise, confession, thanksgiving, etc."],
  "biblical_references": ["array of specific biblical connections, verses, or concepts"],
  "worship_elements": ["array of worship aspects like congregational singing, reflection, celebration, etc."],
  "emotional_tone": "single word describing primary emotional tone (Joyful, Reverent, Contemplative, etc.)",
  "service_placement": "recommended service placement (Opening, Worship, Communion, Closing, etc.)",
  "seasonal_appropriateness": ["array of appropriate seasons/occasions like Christmas, Easter, General, etc."],
  "complexity_level": "Simple, Moderate, or Complex",
  "summary": "brief 2-3 sentence summary of the song's worship value and use",
  "analyzed_at": "${new Date().toISOString()}",
  "confidence_score": 0.85
}

Focus on practical worship planning insights. Keep themes concise and actionable. Only respond with valid JSON.`;
	}

	async analyzeLyrics(
		title: string,
		artist: string | undefined,
		lyrics: string
	): Promise<LyricsAnalysis> {
		if (!this.apiKey) {
			throw new Error('Mistral API key is required');
		}

		if (!lyrics || lyrics.trim().length === 0) {
			throw new Error('Lyrics content is required for analysis');
		}

		const prompt = this.getAnalysisPrompt(title, artist, lyrics);

		try {
			const response = await fetch(this.baseURL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: 'mistral-small-latest', // Use the most cost-effective model
					messages: [
						{
							role: 'user',
							content: prompt
						}
					],
					temperature: 0.3, // Lower temperature for more consistent results
					max_tokens: 800, // Reasonable limit for structured response
					response_format: { type: 'json_object' }
				})
			});

			if (!response.ok) {
				const errorData: MistralAPIError = await response.json();
				throw new Error(`Mistral API error (${response.status}): ${errorData.error.message}`);
			}

			const data: MistralAPIResponse = await response.json();

			if (!data.choices || data.choices.length === 0) {
				throw new Error('No response generated from Mistral API');
			}

			const content = data.choices[0].message.content;

			try {
				const analysis: LyricsAnalysis = JSON.parse(content);

				// Validate required fields
				if (!analysis.title || !analysis.themes || !analysis.summary) {
					throw new Error('Invalid analysis structure received from API');
				}

				// Ensure arrays are properly initialized
				analysis.themes = analysis.themes || [];
				analysis.biblical_references = analysis.biblical_references || [];
				analysis.worship_elements = analysis.worship_elements || [];
				analysis.seasonal_appropriateness = analysis.seasonal_appropriateness || [];

				// Set defaults for missing fields
				analysis.complexity_level = analysis.complexity_level || 'Moderate';
				analysis.emotional_tone = analysis.emotional_tone || 'Reverent';
				analysis.service_placement = analysis.service_placement || 'Worship';
				analysis.analyzed_at = new Date().toISOString();
				analysis.confidence_score = analysis.confidence_score || 0.8;

				return analysis;
			} catch {
				console.error('Failed to parse Mistral response:', content);
				throw new Error('Failed to parse analysis response from Mistral API');
			}
		} catch (error) {
			if (error instanceof Error) {
				// Re-throw known errors
				throw error;
			}

			// Handle network or other unknown errors
			throw new Error('Failed to connect to Mistral API. Please check your internet connection.');
		}
	}

	async testConnection(): Promise<{ success: boolean; error?: string }> {
		try {
			// Simple test with minimal content
			const testLyrics = 'Amazing grace, how sweet the sound';
			await this.analyzeLyrics('Test Song', undefined, testLyrics);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Factory function for creating Mistral client instances
export function createMistralClient(apiKey: string): MistralClient {
	return new MistralClient(apiKey);
}

// Helper function to validate API key format (basic validation)
export function isValidMistralAPIKey(apiKey: string): boolean {
	// Mistral API keys typically start with specific prefixes
	// This is a basic validation - real validation happens on API call
	return typeof apiKey === 'string' && apiKey.length > 20 && apiKey.trim() !== '';
}
