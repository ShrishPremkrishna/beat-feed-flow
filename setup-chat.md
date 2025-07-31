# Chat Feature Setup

The chat feature requires database migrations to be applied. If you're getting "Failed to load conversations" errors, you need to apply the chat migration to your database.

## Option 1: Using Supabase CLI (if local development)

```bash
npx supabase db reset
```

## Option 2: Apply migration manually via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250731000001-create-chat-tables-fixed.sql`
4. Run the SQL query

## Option 3: Using Supabase CLI to push migrations (if using hosted)

```bash
npx supabase db push
```

## Quick Test

After applying the migration, you should be able to:
1. Click "Messages" in the navbar to see the chat interface
2. Click "Message" on any user's profile to start a conversation
3. Send and receive messages in real-time

## Troubleshooting

If you still get errors:
1. Check the browser console for detailed error messages
2. Verify the tables were created in your Supabase database:
   - `conversations` table
   - `messages` table
3. Check that RLS policies are enabled and working properly