# AI-Powered Song Categorization Plan

## Overview

This document outlines the implementation plan for AI-powered song categorization in WorshipWise. When users paste lyrics from SongSelect (or other sources), the system will use an LLM to analyze the lyrics and suggest appropriate tags/categories that can be applied to the song.

## Current State

- Songs already have a `tags` field (JSON array) in the database
- Tag filtering is implemented in the backend API
- Tags are displayed in the UI but entered manually as comma-separated text
- No tag filtering UI exists on the songs page yet

## Proposed Features

### 1. Lyrics Parsing and Tag Suggestion

**User Flow:**
1. User creates/edits a song in the SongForm
2. User pastes lyrics from SongSelect into a lyrics field
3. User clicks "Suggest Tags" button
4. System sends lyrics to LLM API
5. LLM analyzes lyrics and returns suggested tags
6. User reviews and selects which tags to apply

**Implementation:**
- Add `lyrics` field to songs collection (text type)
- Add lyrics textarea to SongForm component
- Add "Suggest Tags" button that triggers AI analysis
- Display suggested tags as checkboxes for user selection

### 2. LLM Integration Options

#### Option A: Server-Side (Recommended)
- Create PocketBase custom endpoint `/api/ai/suggest-tags`
- Use OpenAI/Anthropic/Gemini API from server
- Benefits: API key security, rate limiting, caching

#### Option B: Client-Side
- Direct API calls from browser
- Requires API key management in frontend
- Not recommended for production

### 3. Tag Categories and Standardization

**Predefined Tag Categories:**
- **Theme**: Worship, Praise, Communion, Prayer, Declaration, Thanksgiving
- **Season**: Christmas, Easter, Advent, Lent, Pentecost
- **Mood**: Upbeat, Reflective, Contemplative, Celebratory, Reverent
- **Scripture**: Old Testament, New Testament, Psalms, Gospels
- **Focus**: God's Love, Grace, Salvation, Holy Spirit, Trinity, Faith
- **Service Type**: Opening, Closing, Response, Offering, Communion

**LLM Prompt Template:**
```
Analyze these worship song lyrics and suggest appropriate tags from these categories:

[Categories list]

Lyrics:
"""
[User's pasted lyrics]
"""

Return a JSON array of suggested tags that best describe the song's themes, mood, and appropriate usage. Limit to 5-8 most relevant tags.
```

### 4. Implementation Phases

#### Phase 1: Basic Infrastructure
- [ ] Add `lyrics` field to songs collection
- [ ] Update TypeScript types
- [ ] Add lyrics textarea to SongForm
- [ ] Create tag suggestion UI component

#### Phase 2: LLM Integration
- [ ] Set up PocketBase custom endpoint
- [ ] Integrate chosen LLM API (OpenAI recommended)
- [ ] Implement prompt engineering
- [ ] Add error handling and fallbacks

#### Phase 3: Enhanced Tag Management
- [ ] Create predefined tags management
- [ ] Add tag picker component (replace comma-separated input)
- [ ] Implement tag filtering UI on songs page
- [ ] Add tag usage analytics

#### Phase 4: Advanced Features
- [ ] Auto-detect key and tempo from chord charts
- [ ] Scripture reference extraction
- [ ] Similar song suggestions based on tags
- [ ] Batch processing for existing songs

## Technical Implementation Details

### Database Schema Updates

```javascript
// Update songs collection
{
  name: "lyrics",
  type: "text",
  required: false,
  options: {
    max: 5000
  }
}

// New ai_suggestions collection (for caching)
{
  name: "ai_suggestions",
  type: "base",
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: null,
  updateRule: null,
  deleteRule: null,
  schema: [
    {
      name: "song",
      type: "relation",
      required: true,
      options: {
        collectionId: "songs",
        cascadeDelete: true
      }
    },
    {
      name: "lyrics_hash",
      type: "text",
      required: true
    },
    {
      name: "suggested_tags",
      type: "json",
      required: true
    },
    {
      name: "llm_model",
      type: "text",
      required: true
    }
  ]
}
```

### PocketBase Custom Endpoint

```go
// pb_hooks/ai_tags.pb.js
routerAdd("POST", "/api/ai/suggest-tags", (c) => {
  const data = new DynamicModel({
    lyrics: "",
  })
  
  c.bind(data)
  
  // Check cache first
  const lyricsHash = hash(data.lyrics)
  const cached = $app.dao().findFirstRecordByData("ai_suggestions", "lyrics_hash", lyricsHash)
  
  if (cached) {
    return c.json(200, cached.get("suggested_tags"))
  }
  
  // Call LLM API
  const suggestions = await callLLMAPI(data.lyrics)
  
  // Cache results
  const suggestion = new Record(collection)
  suggestion.set("lyrics_hash", lyricsHash)
  suggestion.set("suggested_tags", suggestions)
  suggestion.set("llm_model", "gpt-4")
  $app.dao().saveRecord(suggestion)
  
  return c.json(200, suggestions)
}, $apis.requireRecordAuth())
```

### Frontend Integration

```typescript
// src/lib/api/ai.ts
export async function suggestTags(lyrics: string): Promise<string[]> {
  const response = await pb.send('/api/ai/suggest-tags', {
    method: 'POST',
    body: { lyrics }
  });
  
  return response;
}

// In SongForm.svelte
async function handleSuggestTags() {
  if (!formData.lyrics?.trim()) {
    return;
  }
  
  suggestingTags = true;
  try {
    const suggestions = await suggestTags(formData.lyrics);
    suggestedTags = suggestions;
    showTagSuggestions = true;
  } catch (error) {
    console.error('Failed to get tag suggestions:', error);
    // Show error toast
  } finally {
    suggestingTags = false;
  }
}
```

## Security Considerations

1. **API Key Management**: Store LLM API keys in environment variables on server
2. **Rate Limiting**: Implement per-user rate limits for AI suggestions
3. **Input Validation**: Sanitize lyrics input, enforce max length
4. **Cost Control**: Monitor API usage, implement daily/monthly limits
5. **Caching**: Cache suggestions to reduce API calls for duplicate lyrics

## Cost Estimation

Using OpenAI GPT-4 Turbo:
- Average lyrics: ~300 words = ~400 tokens
- Prompt template: ~200 tokens  
- Response: ~50 tokens
- Total per request: ~650 tokens
- Cost: ~$0.01 per song analysis
- With caching: Significant reduction for popular songs

## Future Enhancements

1. **Multi-language Support**: Analyze songs in different languages
2. **Chord Analysis**: Extract chord progressions and suggest key
3. **CCLI Integration**: Auto-fetch lyrics from CCLI SongSelect
4. **Similarity Matching**: Find similar songs based on themes
5. **Custom Training**: Fine-tune model on worship song corpus
6. **Collaborative Filtering**: Learn from user tag corrections

## Success Metrics

- Tag suggestion accuracy (user acceptance rate)
- Time saved in song data entry
- Increase in tag usage and filtering
- API cost per active user
- Cache hit rate

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [PocketBase Hooks Documentation](https://pocketbase.io/docs/js-overview/)
- [SongSelect CCLI](https://songselect.ccli.com/)