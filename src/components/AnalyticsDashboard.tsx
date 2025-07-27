import { TrendingUp, Users, Play, Heart, MessageCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const AnalyticsDashboard = () => {
  const stats = {
    totalPlays: 125400,
    totalLikes: 8920,
    totalComments: 1240,
    totalEarnings: 2450,
    followers: 3200,
    engagement: 7.8
  };

  const topBeats = [
    {
      title: 'Dark Trap Vibes',
      plays: 15600,
      likes: 892,
      comments: 156,
      earnings: 340
    },
    {
      title: 'Chill Lo-Fi Study',
      plays: 12300,
      likes: 678,
      comments: 89,
      earnings: 210
    },
    {
      title: 'Future Bass Drop',
      plays: 9800,
      likes: 567,
      comments: 123,
      earnings: 290
    }
  ];

  const recentActivity = [
    { type: 'like', user: 'MC Flow', track: 'Dark Trap Vibes', time: '2 mins ago' },
    { type: 'comment', user: 'Beat Hunter', track: 'Chill Lo-Fi Study', time: '5 mins ago' },
    { type: 'purchase', user: 'Producer X', track: 'Future Bass Drop', time: '12 mins ago' },
    { type: 'follow', user: 'Hip Hop Head', track: null, time: '1 hour ago' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your beat performance and engagement</p>
        </div>
        <Badge className="bg-primary/20 text-primary">Pro Plan</Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlays.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+23%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+15%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="beat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagement}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Beats */}
      <Card className="beat-card">
        <CardHeader>
          <CardTitle>Top Performing Beats</CardTitle>
          <CardDescription>Your most successful tracks this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topBeats.map((beat, index) => (
              <div key={beat.title} className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center font-semibold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium">{beat.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {beat.plays.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {beat.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {beat.comments}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-success">${beat.earnings}</div>
                  <div className="text-sm text-muted-foreground">earned</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="beat-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest interactions with your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'like' ? 'bg-red-500' :
                  activity.type === 'comment' ? 'bg-blue-500' :
                  activity.type === 'purchase' ? 'bg-green-500' :
                  'bg-purple-500'
                }`} />
                <div className="flex-1">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-muted-foreground">
                    {activity.type === 'like' && ' liked your beat '}
                    {activity.type === 'comment' && ' commented on '}
                    {activity.type === 'purchase' && ' purchased '}
                    {activity.type === 'follow' && ' started following you'}
                  </span>
                  {activity.track && (
                    <span className="font-medium">"{activity.track}"</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};