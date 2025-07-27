import { useState } from 'react';
import { Flame, TrendingUp, Clock, Globe, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BeatCard } from './BeatCard';

export const DiscoverPage = () => {
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  const genres = ['All', 'Trap', 'Hip-Hop', 'Lo-Fi', 'R&B', 'Drill', 'Pop', 'Electronic'];
  const timeframes = ['Today', 'This Week', 'This Month', 'All Time'];

  // Mock trending beats
  const trendingBeats = [
    {
      id: '1',
      title: 'Viral Trap Energy',
      artist: 'TrapKing',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
      coverArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      bpm: 145,
      key: 'F# Minor',
      mood: ['Dark', 'Trap', 'Viral'],
      description: 'The beat that broke the internet. Dark trap with viral potential.',
      price: 150,
      likes: 12400,
      comments: 890,
      duration: '3:24',
      isLiked: false
    },
    {
      id: '2',
      title: 'Sunset Vibes',
      artist: 'ChillMaster',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c944?w=400&h=400&fit=crop&crop=face',
      coverArt: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop',
      bpm: 90,
      key: 'C Major',
      mood: ['Chill', 'Lo-Fi', 'Sunset'],
      description: 'Perfect for summer vibes and relaxed moments',
      likes: 8920,
      comments: 234,
      duration: '4:12',
      isLiked: true
    }
  ];

  const newBeats = [
    {
      id: '3',
      title: 'Fresh Drop',
      artist: 'NewProducer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      coverArt: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
      bpm: 130,
      key: 'G Minor',
      mood: ['Fresh', 'Hip-Hop', 'New'],
      description: 'Brand new beat just dropped! First 24 hours.',
      price: 80,
      likes: 156,
      comments: 23,
      duration: '2:58',
      isLiked: false
    }
  ];

  const featuredArtists = [
    {
      name: 'Metro Boomin Jr',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
      followers: '50K',
      verified: true
    },
    {
      name: 'Lo-Fi Princess',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c944?w=400&h=400&fit=crop&crop=face',
      followers: '25K',
      verified: true
    },
    {
      name: 'Drill Master',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      followers: '15K',
      verified: false
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Discover</h1>
          <p className="text-muted-foreground">Find trending beats and rising artists</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre.toLowerCase()}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Featured Artists */}
      <div className="beat-card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          Featured Artists
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredArtists.map((artist) => (
            <div key={artist.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer">
              <img 
                src={artist.avatar} 
                alt={artist.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{artist.name}</h3>
                  {artist.verified && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{artist.followers} followers</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="trending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            New
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="rising" className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Rising
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Trending This Week</h2>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((timeframe) => (
                  <SelectItem key={timeframe} value={timeframe.toLowerCase().replace(' ', '')}>
                    {timeframe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {trendingBeats.map((beat, index) => (
            <div key={beat.id} className="relative">
              {index === 0 && (
                <div className="absolute -top-2 -left-2 z-10">
                  <Badge className="bg-gradient-primary text-white">
                    🔥 #1 Trending
                  </Badge>
                </div>
              )}
              <BeatCard
                beat={beat}
                onSwipe={() => {}}
                onLike={() => {}}
                onComment={() => {}}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="new" className="space-y-6">
          <h2 className="text-xl font-semibold">Fresh Beats</h2>
          {newBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              onSwipe={() => {}}
              onLike={() => {}}
              onComment={() => {}}
            />
          ))}
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <h2 className="text-xl font-semibold">Global Hits</h2>
          <div className="text-center py-12 text-muted-foreground">
            Global trending beats from around the world
          </div>
        </TabsContent>

        <TabsContent value="rising" className="space-y-6">
          <h2 className="text-xl font-semibold">Rising Stars</h2>
          <div className="text-center py-12 text-muted-foreground">
            Up and coming producers and viral beats
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};