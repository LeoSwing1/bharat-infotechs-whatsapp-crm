import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Send } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Badge, EmptyState } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { createSocket } from '../lib/socket';

export default function Inbox() {
  const toast = useToast();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(() => {
    api.get('/inbox/conversations', { params: { search } }).then((res) => setConversations(res.data));
  }, [search]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    if (!user?.tenantId) return () => clearInterval(interval);
    const socket = createSocket(user.tenantId);
    const refresh = () => { loadConversations(); loadThread(); };
    socket.on('inbox.message', refresh);
    socket.on('message.status', refresh);
    return () => { clearInterval(interval); socket.off('inbox.message', refresh); socket.off('message.status', refresh); socket.disconnect(); };
  }, [loadConversations, user?.tenantId]);

  const loadThread = useCallback(() => {
    if (!activeId) return;
    api.get(`/inbox/conversations/${activeId}/messages`).then((res) => setThread(res.data));
  }, [activeId]);

  useEffect(() => {
    loadThread();
    const interval = setInterval(loadThread, 15000);
    return () => clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !activeId) return;
    setSending(true);
    try {
      await api.post(`/inbox/conversations/${activeId}/reply`, { content: replyText });
      setReplyText('');
      loadThread();
      loadConversations();
    } catch (err) {
      toast.push(errorMessage(err, 'Failed to send reply.'), 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="WhatsApp Inbox" />
      <div className="page-body">
        <div className="inbox-layout">
          <div className="conv-list">
            <div style={{ padding: 12, borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 22, top: 22, color: 'var(--color-text-muted)' }} />
              <input placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30, width: '100%' }} />
            </div>
            {conversations.length === 0 ? (
              <EmptyState title="No conversations yet" subtitle="Replies from recipients will appear here." />
            ) : conversations.map((c) => (
              <div key={c.id} className={`conv-item ${activeId === c.id ? 'active' : ''}`} onClick={() => setActiveId(c.id)}>
                <div className="flex-between">
                  <span className="name">{c.contact_name || c.phone}</span>
                  {c.unread > 0 && <span className="badge badge-processing">{c.unread}</span>}
                </div>
                <div className="preview">{c.lastMessage || 'No messages yet'}</div>
              </div>
            ))}
          </div>

          <div className="chat-panel">
            {!activeId || !thread ? (
              <EmptyState title="Select a conversation" subtitle="Choose a contact from the left to view the conversation." />
            ) : (
              <>
                <div className="chat-header flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{thread.conversation.contact_name || thread.conversation.phone}</div>
                    <div className="text-sm muted">{thread.conversation.phone}</div>
                  </div>
                  <Badge status={thread.conversation.status} />
                </div>
                <div className="chat-messages">
                  {thread.messages.map((m) => (
                    <div key={m.id} className={`chat-bubble ${m.direction}`}>
                      {m.content}
                      <div className="text-sm muted" style={{ fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-row" onSubmit={handleSendReply}>
                  <input placeholder="Type a message..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                  <button className="btn btn-primary" type="submit" disabled={sending}><Send size={14} /></button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
