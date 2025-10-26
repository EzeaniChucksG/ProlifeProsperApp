import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isAdmin: boolean;
}

interface Conversation {
  id: number;
  donorName: string;
  donorEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: boolean;
  messages: Message[];
}

const mockConversations: Conversation[] = [
  {
    id: 1,
    donorName: 'Sarah Johnson',
    donorEmail: 'sarah.j@email.com',
    lastMessage: 'Thank you for your support!',
    lastMessageTime: new Date('2025-10-26T10:30:00'),
    unread: true,
    messages: [
      {
        id: 1,
        senderId: 'donor1',
        senderName: 'Sarah Johnson',
        text: 'Hi, I recently made a donation and wanted to learn more about how I can get involved.',
        timestamp: new Date('2025-10-26T10:15:00'),
        isAdmin: false,
      },
      {
        id: 2,
        senderId: 'admin',
        senderName: 'Admin',
        text: 'Thank you so much for reaching out, Sarah! We have several volunteer opportunities available. Would you be interested in our counseling program?',
        timestamp: new Date('2025-10-26T10:20:00'),
        isAdmin: true,
      },
      {
        id: 3,
        senderId: 'donor1',
        senderName: 'Sarah Johnson',
        text: 'Yes, that sounds wonderful! Can you send me more information?',
        timestamp: new Date('2025-10-26T10:25:00'),
        isAdmin: false,
      },
      {
        id: 4,
        senderId: 'admin',
        senderName: 'Admin',
        text: 'Thank you for your support!',
        timestamp: new Date('2025-10-26T10:30:00'),
        isAdmin: true,
      },
    ],
  },
  {
    id: 2,
    donorName: 'Michael Chen',
    donorEmail: 'mchen@email.com',
    lastMessage: 'I have a question about my recurring donation.',
    lastMessageTime: new Date('2025-10-25T15:45:00'),
    unread: false,
    messages: [
      {
        id: 1,
        senderId: 'donor2',
        senderName: 'Michael Chen',
        text: 'I have a question about my recurring donation.',
        timestamp: new Date('2025-10-25T15:45:00'),
        isAdmin: false,
      },
    ],
  },
  {
    id: 3,
    donorName: 'Emily Rodriguez',
    donorEmail: 'emily.r@email.com',
    lastMessage: 'Could you provide a donation receipt for tax purposes?',
    lastMessageTime: new Date('2025-10-24T09:20:00'),
    unread: false,
    messages: [
      {
        id: 1,
        senderId: 'donor3',
        senderName: 'Emily Rodriguez',
        text: 'Could you provide a donation receipt for tax purposes?',
        timestamp: new Date('2025-10-24T09:20:00'),
        isAdmin: false,
      },
    ],
  },
];

export default function DonorChatScreen() {
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState(mockConversations);

  const selectedChat = conversations.find((c) => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now(),
      senderId: 'admin',
      senderName: 'Admin',
      text: messageInput.trim(),
      timestamp: new Date(),
      isAdmin: true,
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: messageInput.trim(),
              lastMessageTime: new Date(),
            }
          : conv
      )
    );

    setMessageInput('');
  };

  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, unread: false } : conv))
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Just now' : `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return date.toLocaleDateString();
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0d72b9" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donor Messages</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.conversationsList}>
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.conversationCard, conv.unread && styles.conversationCardUnread]}
              onPress={() => handleSelectConversation(conv.id)}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{conv.donorName.charAt(0)}</Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.donorName}>{conv.donorName}</Text>
                  <Text style={styles.timeText}>{formatTime(conv.lastMessageTime)}</Text>
                </View>
                <Text style={[styles.lastMessage, conv.unread && styles.lastMessageUnread]}>
                  {conv.lastMessage}
                </Text>
              </View>
              {conv.unread && <View style={styles.unreadBadge} />}
            </TouchableOpacity>
          ))}
          {conversations.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedConversation(null)}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{selectedChat?.donorName}</Text>
          <Text style={styles.chatHeaderEmail}>{selectedChat?.donorEmail}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {selectedChat?.messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageBubble, message.isAdmin ? styles.adminMessage : styles.donorMessage]}
          >
            <Text
              style={[
                styles.messageText,
                message.isAdmin ? styles.adminMessageText : styles.donorMessageText,
              ]}
            >
              {message.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                message.isAdmin ? styles.adminMessageTime : styles.donorMessageTime,
              ]}
            >
              {formatMessageTime(message.timestamp)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message..."
          value={messageInput}
          onChangeText={setMessageInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageInput.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  conversationsList: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  conversationCardUnread: {
    backgroundColor: '#f0f9ff',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0d72b9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0d72b9',
    position: 'absolute',
    top: 20,
    right: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  chatHeaderEmail: {
    fontSize: 14,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  adminMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0d72b9',
  },
  donorMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  adminMessageText: {
    color: '#fff',
  },
  donorMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  adminMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  donorMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 12,
    paddingTop: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d72b9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
