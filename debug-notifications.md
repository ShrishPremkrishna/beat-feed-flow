# Debug Notifications

Let's troubleshoot why notifications aren't showing up. Here are the debugging steps:

## Step 1: Check if notifications table exists

Go to your Supabase dashboard → Database → Tables. Verify that you see a `notifications` table.

## Step 2: Test the database directly

Go to Supabase Dashboard → SQL Editor and run these queries:

### Check if table exists and has data:
```sql
SELECT COUNT(*) FROM notifications;
```

### Check your user ID:
```sql
SELECT auth.uid();
```

### Check if triggers exist:
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%notify%';
```

### Manually create a test notification:
```sql
SELECT create_notification(
    auth.uid(),  -- recipient (yourself)
    auth.uid(),  -- actor (yourself, for testing)
    'system',    -- type
    'Test notification',  -- title
    'This is a test notification to see if the system works',  -- content
    NULL,        -- post_id
    NULL,        -- comment_id  
    NULL,        -- message_id
    NULL,        -- action_url
    '{}'::jsonb  -- metadata
);
```

### Check if the test notification was created:
```sql
SELECT * FROM notifications WHERE recipient_id = auth.uid();
```

## Step 3: Check RLS policies

Make sure the RLS policies allow you to read your own notifications:

```sql
SELECT * FROM notifications WHERE recipient_id = auth.uid();
```

## Step 4: Test message trigger

If you have the chat feature working, send a message and then check:

```sql
SELECT * FROM notifications WHERE type = 'message' AND recipient_id = auth.uid();
```

---

**Run these queries and let me know what results you get. This will help identify exactly where the issue is.**