import type { QuickstartData } from '$lib/types/quickstart.js';
import type { CategoriesAPI } from '$lib/api/categories';
import type { SongsAPI } from '$lib/api/songs';

// Default categories for the church
export const defaultCategories = [
	{
		name: 'Hymns and Te Reo',
		description: 'Traditional hymns and Te Reo Māori songs',
		color: '#8B4513',
		sort_order: 1
	},
	{
		name: 'Contemporary',
		description: 'Contemporary worship songs',
		color: '#4169E1',
		sort_order: 2
	},
	{
		name: 'Seasonal (youth suggestions)',
		description: 'Seasonal songs, often suggested by youth',
		color: '#32CD32',
		sort_order: 3
	},
	{
		name: 'Christmas Songs',
		description: 'Christmas and holiday worship songs',
		color: '#DC143C',
		sort_order: 4
	},
	{
		name: 'Possible New Songs',
		description: 'Songs being considered for regular use',
		color: '#FFD700',
		sort_order: 5
	},
	{
		name: 'Modern (archive list)',
		description: 'Modern songs from the archive',
		color: '#9932CC',
		sort_order: 6
	}
];

export const sampleData: QuickstartData = {
	sampleSongs: [
		{
			title: 'Amazing Grace',
			artist: 'John Newton',
			key_signature: 'G',
			tempo: 72,
			category: 'Hymns and Te Reo',
			tags: ['classic', 'hymn', 'grace'],
			lyrics:
				'Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see'
		},
		{
			title: 'How Great Thou Art',
			artist: 'Carl Boberg',
			key_signature: 'Bb',
			tempo: 68,
			category: 'Hymns and Te Reo',
			tags: ['classic', 'hymn', 'praise'],
			lyrics:
				'O Lord my God when I in awesome wonder\nConsider all the worlds thy hands have made\nI see the stars I hear the rolling thunder\nThy power throughout the universe displayed'
		},
		{
			title: '10,000 Reasons',
			artist: 'Matt Redman',
			key_signature: 'C',
			tempo: 76,
			category: 'Contemporary',
			tags: ['contemporary', 'praise', 'worship'],
			lyrics:
				"Bless the Lord O my soul\nO my soul\nWorship His holy name\nSing like never before\nO my soul\nI'll worship Your holy name"
		},
		{
			title: 'Holy Holy Holy',
			artist: 'Reginald Heber',
			key_signature: 'Eb',
			tempo: 80,
			category: 'Hymns and Te Reo',
			tags: ['classic', 'hymn', 'trinity'],
			lyrics:
				'Holy holy holy Lord God Almighty\nEarly in the morning our song shall rise to Thee\nHoly holy holy merciful and mighty\nGod in three persons blessed Trinity'
		},
		{
			title: 'Cornerstone',
			artist: 'Hillsong',
			key_signature: 'E',
			tempo: 72,
			category: 'Contemporary',
			tags: ['contemporary', 'worship', 'hope'],
			lyrics:
				'My hope is built on nothing less\nThan Jesus blood and righteousness\nI dare not trust the sweetest frame\nBut wholly trust in Jesus name'
		},
		{
			title: 'Great Is Thy Faithfulness',
			artist: 'Thomas Chisholm',
			key_signature: 'F',
			tempo: 70,
			category: 'Hymns and Te Reo',
			tags: ['classic', 'hymn', 'faithfulness'],
			lyrics:
				'Great is thy faithfulness O God my Father\nThere is no shadow of turning with Thee\nThou changest not thy compassions they fail not\nAs Thou hast been Thou forever wilt be'
		},
		{
			title: 'What A Beautiful Name',
			artist: 'Hillsong Worship',
			key_signature: 'D',
			tempo: 68,
			category: 'Contemporary',
			tags: ['contemporary', 'worship', 'jesus'],
			lyrics:
				'You were the Word at the beginning\nOne with God the Lord Most High\nYour hidden glory in creation\nNow revealed in You our Christ'
		},
		{
			title: 'Be Thou My Vision',
			artist: 'Irish Traditional',
			key_signature: 'D',
			tempo: 88,
			category: 'Hymns and Te Reo',
			tags: ['celtic', 'hymn', 'vision'],
			lyrics:
				'Be Thou my vision O Lord of my heart\nNaught be all else to me save that Thou art\nThou my best thought by day or by night\nWaking or sleeping Thy presence my light'
		}
	],
	sampleServices: [
		{
			title: 'Sunday Morning Service',
			theme: "God's Love and Grace",
			date: '2024-12-22',
			songs: ['Amazing Grace', '10,000 Reasons', 'What A Beautiful Name', 'Cornerstone']
		},
		{
			title: 'Christmas Eve Service',
			theme: "Celebration of Christ's Birth",
			date: '2024-12-24',
			songs: ['Holy Holy Holy', 'How Great Thou Art', 'Great Is Thy Faithfulness']
		},
		{
			title: 'New Year Service',
			theme: 'Fresh Start and Hope',
			date: '2025-01-01',
			songs: ['Be Thou My Vision', 'Cornerstone', '10,000 Reasons', 'Amazing Grace']
		}
	]
};

export async function createDefaultCategories(
	categoriesAPI: CategoriesAPI
): Promise<{ [key: string]: string }> {
	console.log('Creating default categories...');

	const categoryMap: { [key: string]: string } = {};

	// First, get existing categories to avoid duplicates
	try {
		const existingCategories = await categoriesAPI.getCategories();
		for (const category of existingCategories) {
			categoryMap[category.name] = category.id;
			console.log(`Found existing category: ${category.name}`);
		}
	} catch (error) {
		console.log('No existing categories found or error fetching them:', error);
	}

	// Create missing categories
	for (const categoryData of defaultCategories) {
		if (categoryMap[categoryData.name]) {
			console.log(`Category "${categoryData.name}" already exists, skipping creation`);
			continue;
		}

		try {
			const category = await categoriesAPI.createCategory(categoryData);
			categoryMap[categoryData.name] = category.id;
			console.log(`Created category: ${categoryData.name}`);
		} catch (error) {
			console.warn(`Failed to create category "${categoryData.name}":`, error);
		}
	}

	console.log(`Successfully created/found ${Object.keys(categoryMap).length} categories`);
	return categoryMap;
}

export async function importSampleData(
	songsAPI: SongsAPI,
	categoriesAPI: CategoriesAPI
	// user: Record<string, unknown> // Reserved for future user-specific data
): Promise<void> {
	console.log('Importing sample data...');

	// First, create categories
	const categoryMap = await createDefaultCategories(categoriesAPI);

	// Import songs with categories
	const importedSongs = [];

	// Create a helper function to find category ID with fallback
	const findCategoryId = async (categoryName: string) => {
		// Try exact match first
		if (categoryMap[categoryName]) {
			return categoryMap[categoryName];
		}

		// Try case-insensitive match
		const exactMatch = Object.keys(categoryMap).find(
			(key) => key.toLowerCase() === categoryName.toLowerCase()
		);
		if (exactMatch) {
			return categoryMap[exactMatch];
		}

		// Try partial match
		const partialMatch = Object.keys(categoryMap).find(
			(key) =>
				key.toLowerCase().includes(categoryName.toLowerCase()) ||
				categoryName.toLowerCase().includes(key.toLowerCase())
		);
		if (partialMatch) {
			console.log(`Using partial match "${partialMatch}" for category "${categoryName}"`);
			return categoryMap[partialMatch];
		}

		// Create a default "General" category if none exists
		if (!categoryMap['General']) {
			try {
				console.log(
					`Creating fallback "General" category for song with missing category "${categoryName}"`
				);
				const generalCategory = await categoriesAPI.createCategory({
					name: 'General',
					description: 'Songs without a specific category',
					sort_order: 999
				});
				categoryMap['General'] = generalCategory.id;
				return generalCategory.id;
			} catch (error) {
				console.warn('Failed to create fallback General category:', error);
				return null;
			}
		}

		return categoryMap['General'];
	};

	for (const songData of sampleData.sampleSongs) {
		try {
			const categoryId = await findCategoryId(songData.category || 'General');
			if (!categoryId) {
				console.warn(`Could not find or create category for song "${songData.title}", skipping`);
				continue;
			}

			const song = await songsAPI.createSong({
				title: songData.title,
				artist: songData.artist,
				category: categoryId,
				key_signature: songData.key_signature,
				tempo: songData.tempo,
				lyrics: songData.lyrics,
				tags: songData.tags || []
			});
			importedSongs.push(song);
			console.log(`Imported song: ${songData.title}`);
		} catch (error) {
			console.warn(`Failed to import song "${songData.title}":`, error);
		}
	}

	console.log(`Successfully imported ${importedSongs.length} sample songs`);

	// Note: Service import would require the services API to be implemented
	// This will be added when Sprint 4 (service functionality) is completed
}
