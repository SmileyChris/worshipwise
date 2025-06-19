# Dynamic Song Availability System

**Status**: 📋 **FUTURE ENHANCEMENT** - Advanced feature planned for Sprint 8-10

## Overview

This plan outlines an advanced dynamic song availability system that goes beyond simple day-counting to provide intelligent, context-aware recommendations for worship song selection. The system will evolve the current green/yellow/red availability indicators into a sophisticated recommendation engine.

## Current State Analysis

### Existing Foundation ✅

- **Database Schema**: Complete song usage tracking with `song_usage` collection
- **Basic Status Calculation**: 14/28-day thresholds for recent/caution/available
- **Visual Indicators**: Color-coded badges in song cards
- **Automatic Tracking**: Usage recorded when setlists are marked complete
- **Batch Operations**: API supports bulk usage lookups

### Current Limitations ❌

- Fixed thresholds (14/28 days) don't account for church-specific patterns
- No consideration of service frequency or seasonal variations
- No advanced metrics like usage frequency, trending, or predictive analysis
- No warnings during setlist creation for recently used songs
- Bug: API queries `usage_date` but schema uses `used_date`

## Dynamic Availability Factors

### 1. **Temporal Factors**

- **Days Since Last Use**: Base factor (current system)
- **Service Frequency**: Weekly vs bi-weekly vs monthly churches
- **Usage Frequency**: How often the song is typically used
- **Seasonal Context**: Christmas, Easter, special seasons
- **Recent Trend**: Increasing vs decreasing usage

### 2. **Contextual Factors**

- **Service Type**: Sunday morning vs evening vs midweek
- **Worship Leader Preference**: Different leaders have different repertoires
- **Key Compatibility**: Songs that work well together in same key
- **Tempo Flow**: Fast/slow song transitions in worship sets
- **Congregation Familiarity**: New songs vs established favorites

### 3. **Statistical Factors**

- **Historical Usage Patterns**: Seasonal and yearly trends
- **Rotation Health**: Even distribution across song library
- **Overuse Prevention**: Detect songs becoming too frequent
- **Underuse Detection**: Identify neglected songs
- **Predictive Modeling**: ML-based availability scoring

### 4. **Church-Specific Factors**

- **Custom Thresholds**: Configurable by church size/culture
- **Special Events**: Baptisms, communion, special services
- **Music Team Capacity**: Available musicians and their abilities
- **Copyright Considerations**: CCLI reporting and compliance

## System Architecture

### 1. **Availability Scoring Engine**

```typescript
interface AvailabilityScore {
	score: number; // 0-100 (higher = more available)
	confidence: number; // 0-100 (confidence in the score)
	factors: FactorWeights; // Breakdown of contributing factors
	recommendation: AvailabilityRecommendation;
}

interface AvailabilityRecommendation {
	status: 'highly_recommended' | 'recommended' | 'caution' | 'avoid';
	reasons: string[]; // Human-readable explanations
	suggestedDate?: Date; // When to consider using again
	alternatives?: string[]; // Similar songs to consider instead
}
```

### 2. **Configurable Scoring Factors**

```typescript
interface ChurchAvailabilityConfig {
	// Temporal settings
	minDaysBetweenUse: number; // Minimum rest period
	cautionThreshold: number; // Days for caution status
	serviceFrequency: 'weekly' | 'biweekly' | 'monthly';

	// Weighting factors (0-1)
	temporal_weight: number; // How much time matters
	frequency_weight: number; // How much usage frequency matters
	seasonal_weight: number; // How much season matters
	leader_preference_weight: number; // How much leader preference matters

	// Advanced settings
	enable_ml_predictions: boolean;
	rotation_health_target: number; // Target usage distribution
	new_song_boost: number; // Boost for newer songs
}
```

### 3. **Data Collection Enhancement**

#### New Fields in `song_usage` Collection:

```javascript
// Additional fields to track
service_attendance: number; // How many people heard it
song_effectiveness: number; // 1-5 rating (optional)
weather_impact: string; // Indoor/outdoor service considerations
special_event_tag: string; // Christmas, Easter, baptism, etc.
```

#### Real-time Analytics:

- Usage pattern detection
- Anomaly identification (suddenly popular/unpopular songs)
- Predictive modeling for future recommendations

### 4. **Machine Learning Components**

#### Usage Pattern Analysis:

- Seasonal usage clustering
- Worship leader preference modeling
- Congregation response prediction
- Optimal rotation timing

#### Recommendation Engine:

- Collaborative filtering based on similar churches
- Content-based filtering using song attributes
- Hybrid approach combining multiple algorithms
- Continuous learning from user feedback

## Implementation Plan

### Phase 1: Enhanced Availability Scoring (Sprint 5)

- **Fix existing bug**: Align API queries with schema (`used_date`)
- **Configurable thresholds**: Church-specific settings
- **Improved status calculation**: Multi-factor scoring
- **Enhanced UI**: Better availability indicators and explanations

### Phase 2: Context-Aware Recommendations (Sprint 6)

- **Service type awareness**: Different rules for different services
- **Worship leader preferences**: Personalized recommendations
- **Seasonal adjustments**: Holiday and special season handling
- **Setlist warnings**: Real-time feedback during planning

### Phase 3: Advanced Analytics (Sprint 7)

- **Usage pattern analysis**: Historical trends and insights
- **Rotation health monitoring**: Library balance reporting
- **Predictive recommendations**: Future availability forecasting
- **Comparative analytics**: Benchmark against similar churches

### Phase 4: Machine Learning Integration (Sprint 8)

- **ML-powered scoring**: Advanced availability algorithms
- **Automatic optimization**: Self-tuning recommendation parameters
- **Predictive analytics**: Forecast congregation preferences
- **Continuous improvement**: Learning from user feedback

## Database Schema Changes

### 1. **New Collection**: `church_availability_config`

```javascript
{
  id: "unique_id",
  church_id: "relation_to_church", // For multi-tenant future
  min_days_between_use: 14,
  caution_threshold: 28,
  service_frequency: "weekly",
  temporal_weight: 0.4,
  frequency_weight: 0.3,
  seasonal_weight: 0.2,
  leader_preference_weight: 0.1,
  enable_ml_predictions: false,
  rotation_health_target: 0.8,
  new_song_boost: 0.2,
  created: "datetime",
  updated: "datetime"
}
```

### 2. **Enhanced**: `song_usage` Collection

```javascript
// Add new fields
service_attendance: "number",
song_effectiveness: "number", // 1-5 rating
weather_impact: "text",
special_event_tag: "text",
congregation_response: "text", // enum: enthusiastic, good, lukewarm, poor
```

### 3. **New Collection**: `availability_scores`

```javascript
{
  id: "unique_id",
  song_id: "relation_to_songs",
  calculated_date: "datetime",
  score: "number", // 0-100
  confidence: "number", // 0-100
  status: "text", // highly_recommended, recommended, caution, avoid
  contributing_factors: "json", // Detailed breakdown
  ml_predictions: "json", // ML model outputs
  next_recommended_date: "datetime",
  created: "datetime"
}
```

## API Enhancements

### 1. **Enhanced Song Availability Endpoint**

```typescript
// GET /api/songs/availability?context=sunday_morning&leader=john_doe
interface SongAvailabilityResponse {
	songs: SongWithEnhancedAvailability[];
	recommendations: {
		highly_recommended: string[];
		recommended: string[];
		caution: string[];
		avoid: string[];
	};
	insights: {
		rotation_health: number;
		overused_songs: string[];
		underused_songs: string[];
		seasonal_suggestions: string[];
	};
}
```

### 2. **Setlist Validation Endpoint**

```typescript
// POST /api/setlists/validate
interface SetlistValidationRequest {
	songs: string[]; // Array of song IDs
	service_date: string;
	service_type: string;
	worship_leader: string;
}

interface SetlistValidationResponse {
	warnings: SetlistWarning[];
	suggestions: SetlistSuggestion[];
	overall_health: number; // 0-100
}
```

## User Experience Enhancements

### 1. **Smart Song Selection Interface**

- **Availability Filters**: Filter by availability status
- **Smart Recommendations**: "Songs perfect for this Sunday"
- **Alternative Suggestions**: "Instead of X, try Y"
- **Rotation Insights**: "You haven't used X in 3 months"

### 2. **Setlist Planning Assistant**

- **Real-time Warnings**: "This song was used 2 weeks ago"
- **Flow Optimization**: Key and tempo compatibility suggestions
- **Balance Monitoring**: Visual indicators of setlist health
- **Predictive Feedback**: "This combination works well together"

### 3. **Analytics Dashboard**

- **Usage Heatmaps**: Visual representation of song rotation
- **Trend Analysis**: Popular vs declining songs
- **Seasonal Patterns**: Christmas, Easter, summer trends
- **Recommendation Accuracy**: How often suggestions are used

## Performance Considerations

### 1. **Caching Strategy**

- **Availability Scores**: Cache for 24 hours with invalidation
- **ML Predictions**: Weekly batch processing
- **Usage Analytics**: Incremental updates with daily aggregation
- **Real-time Calculations**: Optimized for setlist planning

### 2. **Scalability**

- **Background Processing**: ML calculations in worker processes
- **Database Optimization**: Proper indexing for complex queries
- **API Rate Limiting**: Prevent expensive calculation abuse
- **Progressive Enhancement**: Graceful degradation without ML

## Success Metrics

### 1. **Quantitative Metrics**

- **Rotation Health**: Improved distribution across song library
- **Overuse Reduction**: Decrease in songs used too frequently
- **Underuse Detection**: Increase in neglected song usage
- **User Engagement**: Time spent in song selection interface

### 2. **Qualitative Metrics**

- **User Satisfaction**: Feedback on recommendation quality
- **Worship Team Efficiency**: Faster setlist planning
- **Congregation Response**: Improved worship experience
- **Pastor Feedback**: Better alignment with worship goals

## Future Enhancements

### 1. **Advanced AI Features**

- **Natural Language Processing**: "Find upbeat songs about grace"
- **Mood Analysis**: Recommend songs based on current events
- **Cross-Church Learning**: Learn from similar churches
- **Automated Setlist Generation**: AI-powered complete setlists

### 2. **Integration Opportunities**

- **CCLI Integration**: Automatic reporting and compliance
- **Music Streaming**: Link to Spotify/Apple Music for previews
- **Sheet Music Services**: Integration with PraiseCharts, etc.
- **Social Features**: Share recommendations between churches

### 3. **Mobile Optimization**

- **Offline Recommendations**: Cached suggestions for mobile use
- **Voice Commands**: "Hey WorshipWise, what songs should we play?"
- **Quick Actions**: Swipe gestures for fast availability checks
- **Push Notifications**: "Don't forget to mark your setlist complete"

## Implementation Timeline

### Sprint 5 (4 weeks): Foundation Enhancement

- Fix existing API bugs
- Implement configurable thresholds
- Enhanced availability scoring
- Improved UI indicators

### Sprint 6 (4 weeks): Context Awareness

- Service type differentiation
- Worship leader preferences
- Seasonal adjustments
- Setlist validation warnings

### Sprint 7 (4 weeks): Analytics & Insights

- Usage pattern analysis
- Rotation health monitoring
- Predictive recommendations
- Analytics dashboard

### Sprint 8 (4 weeks): Machine Learning

- ML model training
- Advanced scoring algorithms
- Automatic optimization
- Continuous learning system

## Conclusion

This dynamic song availability system transforms the current simple day-counting approach into a sophisticated, intelligent recommendation engine. By considering multiple factors and leveraging machine learning, it will significantly improve worship planning efficiency while ensuring healthy song rotation and enhanced congregational worship experiences.

The phased implementation approach allows for gradual enhancement while maintaining system stability and user adoption. Each phase builds upon the previous, creating a comprehensive solution that scales with church needs and grows more intelligent over time.
