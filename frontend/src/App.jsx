import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Input } from './components/Input';
import { Chip } from './components/Chip';
import './App.css';

// Connect to our new backend server
const socket = io('http://localhost:3001');

// Helper to get or create UUID
function getUserId() {
  let id = localStorage.getItem('chat_uuid');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('chat_uuid', id);
  }
  return id;
}

const myUserId = getUserId();

function App() {
  const [page, setPage] = useState('landing');
  const [userId] = useState(myUserId);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Realtime State
  const [users, setUsers] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  
  // Editing & Replying state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInputText, setEditInputText] = useState('');
  const [replyingToId, setReplyingToId] = useState(null);
  const editContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  // Click outside to cancel edit
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editingMessageId && editContainerRef.current && !editContainerRef.current.contains(e.target)) {
        setEditingMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingMessageId]);

  // Socket.IO Listeners
  useEffect(() => {
    // Get initial saved name from local storage if any
    const savedName = localStorage.getItem('chat_my_name');
    if (savedName) {
      setTempUsername(savedName);
      setUsername(savedName);
    }

    // Connect to server and get initial data
    socket.on('initial_data', (data) => {
      setUsers(data.users);
      setMessages(data.messages);
    });

    socket.on('user_update', (payload) => {
      setUsers((prev) => ({ ...prev, [payload.userId]: payload.username }));
    });

    socket.on('new_message', (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    socket.on('message_edited', (payload) => {
      setMessages((prev) => prev.map(m => m.id === payload.id ? { ...m, text: payload.text, edited: true } : m));
    });

    return () => {
      socket.off('initial_data');
      socket.off('user_update');
      socket.off('new_message');
      socket.off('message_edited');
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = () => {
    setPage('username');
  };

  const handleJoinChat = (e) => {
    e.preventDefault();
    const newName = tempUsername.trim();
    if (!newName) return;

    // Uniqueness check from the globally synchronized users state
    const isTaken = Object.entries(users).some(([id, name]) => name.toLowerCase() === newName.toLowerCase() && id !== userId);
    if (isTaken) {
      setErrorMsg('Username sudah dipakai, silakan gunakan yang lain.');
      return;
    }

    setErrorMsg('');
    setUsername(newName);
    localStorage.setItem('chat_my_name', newName); // save for later

    // Inform server
    socket.emit('join_chat', { userId, username: newName });
    
    setPage('chat');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      const newMsg = {
        id: Date.now() + Math.random().toString(),
        senderId: userId,
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyToId: replyingToId, 
      };
      
      socket.emit('send_message', newMsg);
      setInputText('');
      setReplyingToId(null);
    }
  };

  const handleSaveEdit = (e, msgId) => {
    e.preventDefault();
    if (editInputText.trim()) {
      socket.emit('edit_message', { id: msgId, text: editInputText.trim() });
    }
    setEditingMessageId(null);
  };

  if (page === 'landing') {
    return (
      <div className="container center-layout">
        <div className="hero-section">
          <Chip className="status-chip">Alpha Version</Chip>
          <h1 className="headline-display brand-title">CHAT with FRIEND</h1>
          <p className="body-lg description">
            Meet your friend here and chat whit them!
          </p>
          <div className="actions">
            <Button variant="primary" onClick={handleStart}>{username ? 'Masuk Kembali' : 'Masuk Chat'}</Button>
            <Button variant="secondary" onClick={() => alert('Fitur lainnya akan datang kedepannya!')}>Info Lanjut</Button>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'username') {
    return (
      <div className="container center-layout">
        <Card className="username-card">
          <h2 className="headline-md">Siapa nama kamu?</h2>
          <p className="body-sm mb-4">Masukkan username agar teman-teman di chat tau siapa kamu.</p>
          {errorMsg && <p style={{ color: 'var(--color-error)', marginBottom: '8px', fontSize: '14px' }}>{errorMsg}</p>}
          <form onSubmit={handleJoinChat} className="username-form">
            <Input 
              placeholder="Username..." 
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              autoFocus
              className="username-input"
            />
            <Button variant="primary" type="submit">{username ? 'Ganti Nama' : 'Mulai Chat'}</Button>
          </form>
          {username && (
            <Button variant="tertiary" onClick={() => setPage('chat')} style={{ marginTop: '16px' }}>Batal</Button>
          )}
        </Card>
      </div>
    );
  }

  if (page === 'chat') {
    const replyingToMsg = replyingToId ? messages.find(m => m.id === replyingToId) : null;
    
    return (
      <div className="container chat-layout">
        <header className="chat-header">
          <h2 className="headline-sm">your chat!</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Chip style={{ cursor: 'pointer' }} onClick={() => setPage('username')}>@{username} ✏️</Chip>
            <Button variant="secondary" onClick={() => {
              setPage('landing');
            }} style={{ height: '32px', minWidth: '80px', padding: '4px 12px' }}>Keluar</Button>
          </div>
        </header>

        <Card className="chat-box">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="empty-state body-md">Belum ada pesan. Mulailah menyapa!</div>
            ) : (
              messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="system-message">
                      <Chip className="system-message-chip">{msg.text}</Chip>
                    </div>
                  );
                }

                const isOwn = msg.senderId === userId;
                const senderName = users[msg.senderId] || 'Unknown';
                const isEditing = editingMessageId === msg.id;

                const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

                return (
                  <div key={msg.id} className={`message-item ${isOwn ? 'own-message' : ''}`}>
                    <div className="message-sender label-sm">{senderName}</div>
                    
                    {isEditing ? (
                      <div className="message-bubble" ref={editContainerRef} style={{ padding: '4px' }}>
                        <form onSubmit={(e) => handleSaveEdit(e, msg.id)} style={{ display: 'flex', gap: '8px' }}>
                          <Input 
                            autoFocus
                            value={editInputText} 
                            onChange={(e) => setEditInputText(e.target.value)} 
                            style={{ padding: '4px 8px' }}
                          />
                          <Button variant="primary" type="submit" style={{ padding: '4px 8px', height: 'auto', minWidth: 'auto' }}>Kirim</Button>
                        </form>
                      </div>
                    ) : (
                      <div className="message-bubble body-md">
                        {repliedMsg && (
                          <div className="reply-quote">
                            <div className="reply-quote-sender">{users[repliedMsg.senderId] || 'Unknown'}</div>
                            <div className="reply-quote-text">{repliedMsg.text}</div>
                          </div>
                        )}
                        
                        {msg.text} {msg.edited && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>(edited)</span>}
                        
                        <div className="message-actions">
                          {isOwn && (
                            <button 
                              className="edit-btn" 
                              onClick={() => { setEditingMessageId(msg.id); setEditInputText(msg.text); }}
                              title="Edit Pesan"
                            >
                              ✏️
                            </button>
                          )}
                          <button 
                            className="edit-btn" 
                            onClick={() => { 
                              setReplyingToId(msg.id); 
                              setInputText(''); 
                              setTimeout(() => chatInputRef.current?.focus(), 0);
                            }}
                            title="Balas Pesan"
                          >
                            ↩️
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="message-time label-sm">{msg.timestamp}</div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="reply-input-wrapper">
            {replyingToMsg && (
              <div className="reply-indicator">
                <div>
                  <span style={{ fontWeight: 'bold' }}>Membalas {users[replyingToMsg.senderId] || 'Unknown'}:</span> {replyingToMsg.text}
                </div>
                <button className="cancel-reply-btn" onClick={() => setReplyingToId(null)}>✖️</button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="chat-input-area" style={{ marginTop: replyingToMsg ? '0' : 'var(--spacing-sm)' }}>
              <Input 
                ref={chatInputRef}
                placeholder="Ketik pesan..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="chat-input"
                autoFocus={!!replyingToId}
              />
              <Button variant="primary" type="submit" style={{ minWidth: '80px' }}>Kirim</Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

export default App;
