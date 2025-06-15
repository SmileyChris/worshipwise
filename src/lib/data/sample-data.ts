import type { QuickstartData } from '$lib/types/quickstart.js';

export const sampleData: QuickstartData = {
	sampleSongs: [
		{
			title: "Amazing Grace",
			artist: "John Newton",
			key_signature: "G",
			tempo: 72,
			genre: "Hymn",
			tags: ["classic", "hymn", "grace"],
			lyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see"
		},
		{
			title: "How Great Thou Art",
			artist: "Carl Boberg",
			key_signature: "Bb",
			tempo: 68,
			genre: "Hymn",
			tags: ["classic", "hymn", "praise"],
			lyrics: "O Lord my God when I in awesome wonder\nConsider all the worlds thy hands have made\nI see the stars I hear the rolling thunder\nThy power throughout the universe displayed"
		},
		{
			title: "10,000 Reasons",
			artist: "Matt Redman",
			key_signature: "C",
			tempo: 76,
			genre: "Contemporary",
			tags: ["contemporary", "praise", "worship"],
			lyrics: "Bless the Lord O my soul\nO my soul\nWorship His holy name\nSing like never before\nO my soul\nI'll worship Your holy name"
		},
		{
			title: "Holy Holy Holy",
			artist: "Reginald Heber",
			key_signature: "Eb",
			tempo: 80,
			genre: "Hymn",
			tags: ["classic", "hymn", "trinity"],
			lyrics: "Holy holy holy Lord God Almighty\nEarly in the morning our song shall rise to Thee\nHoly holy holy merciful and mighty\nGod in three persons blessed Trinity"
		},
		{
			title: "Cornerstone",
			artist: "Hillsong",
			key_signature: "E",
			tempo: 72,
			genre: "Contemporary",
			tags: ["contemporary", "worship", "hope"],
			lyrics: "My hope is built on nothing less\nThan Jesus blood and righteousness\nI dare not trust the sweetest frame\nBut wholly trust in Jesus name"
		},
		{
			title: "Great Is Thy Faithfulness",
			artist: "Thomas Chisholm",
			key_signature: "F",
			tempo: 70,
			genre: "Hymn",
			tags: ["classic", "hymn", "faithfulness"],
			lyrics: "Great is thy faithfulness O God my Father\nThere is no shadow of turning with Thee\nThou changest not thy compassions they fail not\nAs Thou hast been Thou forever wilt be"
		},
		{
			title: "What A Beautiful Name",
			artist: "Hillsong Worship",
			key_signature: "D",
			tempo: 68,
			genre: "Contemporary",
			tags: ["contemporary", "worship", "jesus"],
			lyrics: "You were the Word at the beginning\nOne with God the Lord Most High\nYour hidden glory in creation\nNow revealed in You our Christ"
		},
		{
			title: "Be Thou My Vision",
			artist: "Irish Traditional",
			key_signature: "D",
			tempo: 88,
			genre: "Hymn",
			tags: ["celtic", "hymn", "vision"],
			lyrics: "Be Thou my vision O Lord of my heart\nNaught be all else to me save that Thou art\nThou my best thought by day or by night\nWaking or sleeping Thy presence my light"
		}
	],
	sampleSetlists: [
		{
			title: "Sunday Morning Service",
			theme: "God's Love and Grace",
			date: "2024-12-22",
			songs: ["Amazing Grace", "10,000 Reasons", "What A Beautiful Name", "Cornerstone"]
		},
		{
			title: "Christmas Eve Service",
			theme: "Celebration of Christ's Birth",
			date: "2024-12-24",
			songs: ["Holy Holy Holy", "How Great Thou Art", "Great Is Thy Faithfulness"]
		},
		{
			title: "New Year Service",
			theme: "Fresh Start and Hope",
			date: "2025-01-01",
			songs: ["Be Thou My Vision", "Cornerstone", "10,000 Reasons", "Amazing Grace"]
		}
	]
};

export async function importSampleData(songsAPI: any, user: any): Promise<void> {
	console.log('Importing sample data...');
	
	// Import songs
	const importedSongs = [];
	for (const songData of sampleData.sampleSongs) {
		try {
			const song = await songsAPI.create({
				...songData,
				created_by: user.id,
				tags: JSON.stringify(songData.tags || [])
			});
			importedSongs.push(song);
			console.log(`Imported song: ${songData.title}`);
		} catch (error) {
			console.warn(`Failed to import song "${songData.title}":`, error);
		}
	}

	console.log(`Successfully imported ${importedSongs.length} sample songs`);
	
	// Note: Setlist import would require the setlists API to be implemented
	// This will be added when Sprint 4 (setlist functionality) is completed
}