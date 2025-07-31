# Notifications Feature Setup

The notifications feature has been implemented with a bell icon in the navbar (left of messages), centered search bar, and a popup notification system. To complete the setup, you need to apply the database migration.

## Database Migration Required

You need to apply the notifications database migration to enable the feature:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250731000002-create-notifications-table.sql`
4. Run the SQL query

### Option 2: Using Supabase CLI (if linked to project)

```bash
npx supabase db push
```

## What's Included

The notifications system provides:

### ✅ **UI Components**
- Bell icon in navbar with unread notification badge
- Centered search bar layout
- Popup notification panel (not a new page)
- Real-time notification updates

### ✅ **Notification Types**
- **Messages**: When someone sends you a message
- **Likes**: When someone likes your posts or replies
- **Replies**: When someone replies to your posts
- **Follows**: When someone follows you

### ✅ **Features**
- Real-time notification updates using Supabase subscriptions
- Unread notification count badge
- Mark individual notifications as read
- "Mark all as read" functionality
- Click notifications to navigate to relevant content
- Automatic notification creation via database triggers

### ✅ **Database Schema**
- Complete `notifications` table with all required fields
- Automated triggers for all notification types
- Row Level Security (RLS) policies
- Helper functions for managing notifications

## How It Works

1. **Automatic Notifications**: Database triggers automatically create notifications when:
   - Someone sends you a message
   - Someone likes your post or reply
   - Someone replies to your post
   - Someone follows you

2. **Real-time Updates**: The navbar badge updates in real-time when new notifications arrive

3. **Navigation**: Clicking notifications takes you to the relevant content:
   - Message notifications → Messages page
   - Post/reply notifications → Post detail page
   - Follow notifications → User profile page

4. **Privacy**: Users only see their own notifications (enforced by RLS policies)

## Testing

After applying the migration:

1. **Test Messages**: Send a message to see message notifications
2. **Test Likes**: Like someone's post to trigger like notifications
3. **Test Replies**: Reply to someone's post to trigger reply notifications
4. **Test Follows**: Follow someone to trigger follow notifications
5. **Test UI**: Click the bell icon to see the notifications popup
6. **Test Badge**: Verify unread count shows on the bell icon

## Troubleshooting

If notifications aren't working:

1. **Check Database**: Verify the `notifications` table exists in your Supabase database
2. **Check RLS**: Ensure Row Level Security policies are enabled
3. **Check Triggers**: Verify database triggers are created for each notification type
4. **Check Console**: Look for any JavaScript errors in the browser console
5. **Check Network**: Verify API calls to Supabase are successful

The notification system is now fully integrated and ready to use once the database migration is applied!