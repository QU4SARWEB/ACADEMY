-- Remove chat message notification trigger (chat is already real-time, no need for notifications)
DROP TRIGGER IF EXISTS trg_notify_chat_message ON chat_messages;
DROP FUNCTION IF EXISTS notify_chat_message;

-- Clean up existing chat message notifications
DELETE FROM notifications WHERE type = 'message';
