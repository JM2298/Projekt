import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import MordkaPreview from '../components/MordkaPreview';

const panelLimits = {
  contacts: { min: 220, max: 420 },
  preferences: { min: 260, max: 520 },
};

function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState('');
  const [selected, setSelected] = useState(null);
  const [userId, setUserId] = useState('');
  const [userIdLoading, setUserIdLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [socketError, setSocketError] = useState('');
  const [messagesByContact, setMessagesByContact] = useState({});
  const [unreadByContact, setUnreadByContact] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const contactsRef = useRef([]);
  const selectedRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [quickReplies, setQuickReplies] = useState(['Jestem na mapie', 'Potwierdzam odbiór', 'Dodaję punkt']);
  const [newReply, setNewReply] = useState('');
  const [panelSizes, setPanelSizes] = useState({ contacts: 260, preferences: 320 });
  const [sidebarWidth] = useState(240);
  const [preferences, setPreferences] = useState({
    notifications: true,
    sound: true,
    compact: false,
    typingPreview: true,
    theme: 'ciemny',
  });
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState('');
  const [lastInvitationsUpdate, setLastInvitationsUpdate] = useState('');
  const [activeInvitationKey, setActiveInvitationKey] = useState(null);
  const [invitationActionState, setInvitationActionState] = useState({ status: 'idle', message: '' });
  const [pendingMessages, setPendingMessages] = useState([]);

  const getMessageSenderId = useCallback((message) => {
    return (
      message?.nadawca ??
      message?.sender ??
      message?.author ??
      message?.user ??
      message?.user_id ??
      message?.from ??
      null
    );
  }, []);

  const getContactKey = useCallback((contact, fallbackIndex) => {
    return (
      contact?.friend_id ??
      contact?.friend_user_id ??
      contact?.friend_uuid ??
      contact?.id ??
      contact?.uuid ??
      contact?.friend_username ??
      fallbackIndex
    );
  }, []);

  const getContactId = useCallback((contact) => {
    if (!contact) return null;

    return (
      contact.friend_id ??
      contact.friend_user_id ??
      contact.friend_uuid ??
      contact.uuid ??
      contact.id ??
      null
    );
  }, []);

  const getContactDisplayName = useCallback((contact, fallback = 'Nieznany kontakt') => {
    if (!contact) return fallback;

    return (
      contact.friend_display_name ||
      contact.friend_username ||
      contact.username ||
      contact.display_name ||
      contact.name ||
      fallback
    );
  }, []);

  const getContactStatus = useCallback((contact) => {
    const rawStatus = contact?.friend_status || contact?.status || '';
    const normalized = rawStatus
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const isUnavailable = normalized.includes('niedostepn');
    const isAvailable = normalized.includes('dostepn') && !isUnavailable;

    return {
      label: rawStatus || 'Status nieznany',
      className: isAvailable ? 'online' : 'offline',
    };
  }, []);

  const getContactByKey = useCallback(
    (contactKey) => {
      const stringKey = contactKey?.toString?.();
      if (!stringKey) return null;

      return (
        contactsRef.current.find((contact, index) => {
          const key = getContactKey(contact, index);
          return key?.toString?.() === stringKey;
        }) ?? null
      );
    },
    [getContactKey],
  );

  const getCreatedLabel = useCallback((invitation) => {
    const rawDate = invitation.created_at || invitation.created;
    if (!rawDate) return '';

    try {
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return rawDate;

      return parsed.toLocaleString();
    } catch (error) {
      return rawDate;
    }
  }, []);

  const getInvitationMordka = useCallback((invitation) => {
    return (
      invitation?.user_mordka ||
      invitation?.sender_mordka ||
      invitation?.inviter_mordka ||
      invitation?.mordka ||
      invitation?.user?.mordka ||
      ''
    );
  }, []);

  const getInviterName = useCallback((invitation, fallback = 'Nieznany zapraszający') => {
    if (!invitation) return fallback;

    return (
      invitation.user_display_name ||
      invitation.user ||
      invitation.user_username ||
      invitation.user_name ||
      invitation.user?.display_name ||
      invitation.sender_display_name ||
      invitation.sender_username ||
      invitation.sender_name ||
      invitation.sender ||
      invitation.inviter_name ||
      invitation.inviter_username ||
      invitation.inviter_display_name ||
      invitation.inviter ||
      fallback
    );
  }, []);

  const resolveStatus = useCallback((invitation) => {
    const rawStatus =
      invitation.status ||
      invitation.state ||
      invitation.decision_status ||
      invitation.invitation_status ||
      '';

    const lowered = rawStatus.toString().trim().toLowerCase();
    const labeledStatus =
      {
        pending: 'Oczekujące',
        accepted: 'Zaakceptowane',
        rejected: 'Odrzucone',
        declined: 'Odrzucone',
        canceled: 'Anulowane',
      }[lowered] || '';

    if (labeledStatus) return labeledStatus;
    if (invitation.accepted) return 'Zaakceptowane';
    if (invitation.rejected || invitation.declined) return 'Odrzucone';

    return rawStatus || 'Oczekujące';
  }, []);

  const fetchInvitations = useCallback(
    async (signal) => {
      setInvitationsLoading(true);
      setInvitationsError('');

      try {
        const response = await apiRequest(
          '/joker-chat-api/joker-chat/friendships/invitations/',
          { signal },
        );

        if (!response.ok) {
          throw new Error(`Błąd pobierania zaproszeń (${response.status})`);
        }

        const data = await response.json();
        setInvitations(Array.isArray(data) ? data : []);
        setLastInvitationsUpdate(new Date().toLocaleString());
      } catch (error) {
        if (error.name !== 'AbortError') {
          setInvitations([]);
          setInvitationsError('Nie udało się pobrać zaproszeń.');
        }
      } finally {
        setInvitationsLoading(false);
      }
    },
    [resolveStatus],
  );

  const fetchUserId = useCallback(async (signal) => {
    setUserIdLoading(true);

    try {
      const response = await apiRequest('/joker-login-api/me/', { signal });

      if (!response.ok) {
        throw new Error('Błąd pobierania profilu użytkownika.');
      }

      const data = await response.json();
      const resolvedId = data?.id ?? data?.user_id ?? data?.userId ?? '';

      if (resolvedId) {
        setUserId(String(resolvedId));
        setSocketError('');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSocketError('Nie udało się pobrać identyfikatora użytkownika.');
      }
    } finally {
      setUserIdLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchInvitations(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchInvitations]);

  const fetchContacts = useCallback(async (signal) => {
    setContactsLoading(true);
    setContactsError('');

    try {
      const response = await apiRequest('/joker-chat-api/joker-chat/friendships/friends/', { signal });

      if (!response.ok) {
        throw new Error(`Błąd pobierania kontaktów (${response.status})`);
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data : [];

      setContacts(normalized);

      if (normalized.length) {
        const firstContactKey = getContactKey(normalized[0], 0);

        setSelected((prev) => (prev === null ? firstContactKey : prev));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setContactsError('Nie udało się pobrać kontaktów.');
        setContacts([]);
      }
    } finally {
      setContactsLoading(false);
    }
  }, [getContactKey]);

  useEffect(() => {
    const controller = new AbortController();

    fetchContacts(controller.signal);
    fetchUserId(controller.signal);

    return () => controller.abort();
  }, [fetchContacts, fetchUserId]);

  useEffect(() => {
    if (userId || userIdLoading) return undefined;

    const controller = new AbortController();
    fetchUserId(controller.signal);

    return () => controller.abort();
  }, [fetchUserId, userId, userIdLoading]);

  const coerceId = useCallback((rawId) => {
    const numericId = Number(rawId);
    return Number.isNaN(numericId) ? rawId : numericId;
  }, []);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    selectedRef.current = selected?.toString?.() ?? selected;
  }, [selected]);

  useEffect(() => {
    const activeKey = selected?.toString?.() ?? selected;
    if (!activeKey) return;

    setUnreadByContact((prev) => {
      if (!prev[activeKey]) return prev;

      const { [activeKey]: _, ...rest } = prev;
      return rest;
    });
  }, [selected]);

  const getMessageTimestamp = useCallback((message) => {
    const rawTimestamp =
      message?.createdAt ??
      message?.created_at ??
      message?.created ??
      message?.timestamp ??
      message?.time ??
      '';
    const parsed = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN;
    return Number.isNaN(parsed) ? 0 : parsed;
  }, []);

  const normalizeConversationMessages = useCallback(
    (messages) => {
      const seen = new Set();

      const buildKey = (message) => {
        const content = (message?.content ?? message?.message ?? '').trim();
        const sender = message?.from ?? message?.nadawca ?? message?.sender ?? '';
        const timestamp =
          message?.createdAt ?? message?.created_at ?? message?.created ?? message?.timestamp ?? message?.time ?? '';
        const parsed = timestamp ? new Date(timestamp) : null;
        const normalizedTimestamp =
          parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : timestamp || '';

        return `${sender}||${normalizedTimestamp}||${content}`;
      };

      return messages
        .map((message) => {
          const timestamp =
            message?.createdAt ??
            message?.created_at ??
            message?.created ??
            message?.timestamp ??
            message?.time ??
            '';
          const parsed = timestamp ? new Date(timestamp) : null;
          const isoTimestamp = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
          const readableTime =
            message.time ||
            (isoTimestamp
              ? new Date(isoTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : '—');

          return {
            ...message,
            id: message.id ?? buildKey(message),
            createdAt: isoTimestamp ?? timestamp ?? null,
            time: readableTime,
          };
        })
        .filter((message) => {
          const key = buildKey(message);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
    },
    [getMessageTimestamp],
  );

  const appendMessage = useCallback(
    (conversationKey, message) => {
      if (!conversationKey) return;

      setMessagesByContact((prev) => {
        const key = conversationKey.toString();
        const existing = prev[key] ?? [];
        return {
          ...prev,
          [key]: normalizeConversationMessages([...existing, message]),
        };
      });
    },
    [normalizeConversationMessages],
  );

  const updateMessageStatus = useCallback((conversationKey, messageId, status) => {
    if (!conversationKey || !messageId) return;

    setMessagesByContact((prev) => {
      const key = conversationKey.toString();
      const existing = prev[key] ?? [];

      const updated = existing.map((message) =>
        message.id === messageId ? { ...message, status } : message,
      );

      return {
        ...prev,
        [key]: updated,
      };
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setSocketStatus('disconnected');
      return undefined;
    }

    setSocketStatus('connecting');
    setSocketError('');

    const socket = new WebSocket(`ws://localhost/ws/chat/${userId}/`);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketStatus('open');
      setSocketError('');

      setPendingMessages((queued) => {
        queued.forEach(({ payload, contactKey, messageId }) => {
          socket.send(JSON.stringify(payload));
          updateMessageStatus(contactKey, messageId, 'sent');
        });

        return [];
      });
    };

    socket.onerror = () => {
      setSocketStatus('error');
      setSocketError('Wystąpił problem z połączeniem WebSocket.');
    };

    socket.onclose = () => {
      setSocketStatus('closed');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const senderKey = data?.nadawca ?? data?.sender ?? 'nieznany';

        // Serwer odsyła również nasze własne komunikaty, co powodowało dublowanie wpisów.
        // Jeśli nadawcą jesteśmy my sami, pomijamy ponowne dodanie wiadomości.
        if (userId && senderKey?.toString?.() === userId.toString()) {
          return;
        }

        const senderContact = getContactByKey(senderKey);
        const senderName = getContactDisplayName(senderContact, senderKey || 'Nieznany kontakt');
        const readableTime = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        appendMessage(senderKey, {
          from: senderName,
          content: data?.message ?? '',
          createdAt: new Date().toISOString(),
          time: readableTime,
        });

        const keyString = senderKey?.toString?.() ?? senderKey;
        const activeKey = selectedRef.current;
        setUnreadByContact((prev) => {
          if (!keyString) return prev;
          if (activeKey?.toString?.() === keyString) {
            if (!prev[keyString]) return prev;
            const { [keyString]: _, ...rest } = prev;
            return rest;
          }

          return {
            ...prev,
            [keyString]: (prev[keyString] ?? 0) + 1,
          };
        });
      } catch (error) {
        console.error('Nieprawidłowy komunikat WebSocket:', error);
      }
    };

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [appendMessage, getContactByKey, getContactDisplayName, updateMessageStatus, userId]);

  const selectedContact = useMemo(
    () => contacts.find((contact, index) => getContactKey(contact, index) === selected) ?? null,
    [contacts, getContactKey, selected],
  );

  const markContactAsViewed = useCallback(
    async (contact, signal) => {
      const contactId = getContactId(contact);
      if (!contactId) return;

      try {
        await apiRequest('/joker-chat-api/joker-chat/friendships/last-view-contact/', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 'friend-id': contactId }),
          signal,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Nie udało się zaktualizować czasu ostatniego podglądu kontaktu.', error);
        }
      }
    },
    [getContactId],
  );

  const loadUnreadCounts = useCallback(
    async (signal) => {
      if (!contacts.length || !userId) return;

      const maxMessages = 100;
      const unreadEntries = await Promise.all(
        contacts.map(async (contact, index) => {
          const contactId = getContactId(contact);
          const contactKey = getContactKey(contact, index)?.toString?.();
          const lastViewed = contact?.last_view_contact;

          if (!contactId || !contactKey || !lastViewed) return [contactKey, 0];

          const url =
            `/joker-chat-api/joker-chat/messages/conversation/${contactId}/${maxMessages}/` +
            `?from=${encodeURIComponent(lastViewed)}`;

          try {
            const response = await apiRequest(url, { signal });

            if (!response.ok) {
              throw new Error(`Nie udało się pobrać nowych wiadomości (${response.status}).`);
            }

            const data = await response.json();
            if (!Array.isArray(data) || !data.length) return [contactKey, 0];

            const incomingSinceLastView = data.filter((message) => {
              const senderId = getMessageSenderId(message);
              return senderId?.toString?.() === contactId.toString();
            }).length;

            return [contactKey, incomingSinceLastView];
          } catch (error) {
            if (error.name === 'AbortError') return [contactKey, 0];
            console.error('Nie udało się obliczyć liczby nieprzeczytanych wiadomości.', error);
            return [contactKey, 0];
          }
        }),
      );

      setUnreadByContact((prev) => {
        const next = { ...prev };

        unreadEntries.forEach(([key, count]) => {
          if (!key || !count) return;
          next[key] = Math.max(prev[key] ?? 0, count);
        });

        return next;
      });
    },
    [contacts, getContactId, getContactKey, getMessageSenderId, userId],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadUnreadCounts(controller.signal);

    return () => controller.abort();
  }, [loadUnreadCounts]);

  useEffect(() => {
    if (!selectedContact) return undefined;

    const controller = new AbortController();
    markContactAsViewed(selectedContact, controller.signal);

    return () => controller.abort();
  }, [markContactAsViewed, selectedContact]);

  const messages = useMemo(
    () => messagesByContact[selected?.toString?.() ?? selected] ?? [],
    [messagesByContact, selected],
  );

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, selected]);

  const formatApiMessage = useCallback(
    (message, contactName) => {
      const senderId =
        message?.nadawca ??
        message?.sender ??
        message?.author ??
        message?.user ??
        message?.user_id ??
        message?.from ??
        '';

      const rawTimestamp =
        message?.created_at ?? message?.created ?? message?.timestamp ?? message?.time ?? '';
      const parsedDate = rawTimestamp ? new Date(rawTimestamp) : null;
      const readableTime =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
          : '';

      return {
        id: message?.id ?? message?.uuid ?? `${senderId}-${rawTimestamp || message?.message || ''}`,
        from: senderId?.toString?.() === userId?.toString?.() ? 'Ty' : contactName,
        content: message?.message ?? message?.content ?? message?.text ?? '',
        time: readableTime || '—',
        createdAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : rawTimestamp,
      };
    },
    [userId],
  );

  const loadMessages = useCallback(
    async ({ limit = 25, signal, markAsArchive = false } = {}) => {
      const activeKey = selected?.toString?.();
      if (!activeKey) return;

      const selectedContact = getContactByKey(activeKey);
      const contactId = getContactId(selectedContact);

      if (!selectedContact || !contactId) {
        setMessagesError('Wybrany kontakt nie ma przypisanego identyfikatora.');
        return;
      }

      const contactName = getContactDisplayName(selectedContact, 'Nieznany znajomy');
      const baseUrl = `/joker-chat-api/joker-chat/messages/conversation/${contactId}/`;
      const maxMessages = 100;
      const resolvedLimit =
        limit === 'all'
          ? maxMessages
          : typeof limit === 'number'
            ? Math.min(limit, maxMessages)
            : 25;
      const url = `${baseUrl}${resolvedLimit}/`;

      setMessagesLoading(true);
      setMessagesError('');

      if (markAsArchive) {
        setArchiveLoading(true);
      }

      try {
        const response = await apiRequest(url, { signal });

        if (!response.ok) {
          throw new Error(`Nie udało się pobrać wiadomości (${response.status}).`);
        }

        const data = await response.json();
        const normalized = Array.isArray(data) ? data : [];
        const sorted = normalized
          .slice()
          .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
        const formatted = sorted.map((message) => formatApiMessage(message, contactName));

        setMessagesByContact((prev) => {
          const existing = prev[activeKey] ?? [];
          const queued = existing.filter((message) => message.status === 'queued');
          const merged = normalizeConversationMessages([...formatted, ...queued]);
          return { ...prev, [activeKey]: merged };
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessagesError('Nie udało się pobrać wiadomości.');
        }
      } finally {
        setMessagesLoading(false);

        if (markAsArchive) {
          setArchiveLoading(false);
        }
      }
    },
    [
      formatApiMessage,
      getContactByKey,
      getContactDisplayName,
      getContactId,
      getMessageTimestamp,
      selected,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadMessages({ signal: controller.signal });

    return () => controller.abort();
  }, [loadMessages]);

  const invitationCounters = useMemo(() => {
    const counters = {
      total: invitations.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      other: 0,
    };

    invitations.forEach((invitation) => {
      const status = resolveStatus(invitation).toLowerCase();

      if (status.includes('oczek')) counters.pending += 1;
      else if (status.includes('zaakcept')) counters.accepted += 1;
      else if (status.includes('odrzu') || status.includes('declin')) counters.rejected += 1;
      else counters.other += 1;
    });

    return counters;
  }, [invitations, resolveStatus]);

  const handleSend = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    if (!selectedContact) {
      setSocketError('Wybierz odbiorcę przed wysłaniem wiadomości.');
      return;
    }

    if (!userId) {
      setSocketError('Uzupełnij swój identyfikator użytkownika.');
      return;
    }

    const readableTime = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    const createdAt = new Date().toISOString();
    const recipientId = getContactId(selectedContact);

    if (!recipientId) {
      setSocketError('Wybrany kontakt nie ma przypisanego identyfikatora.');
      return;
    }
    const senderId = coerceId(userId);
    const payload = {
      message: draft.trim(),
      nadawca: senderId,
      odbiorca: coerceId(recipientId),
    };

    const messageId = crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
    const baseMessage = {
      id: messageId,
      from: 'Ty',
      content: draft.trim(),
      time: readableTime,
      createdAt,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      appendMessage(selected, { ...baseMessage, status: 'sent' });
      setSocketError('');
    } else {
      setSocketError('Brak aktywnego połączenia WebSocket. Wiadomość zostanie wysłana po ponownym połączeniu.');
      setPendingMessages((prev) => [...prev, { payload, contactKey: selected, messageId }]);
      appendMessage(selected, { ...baseMessage, status: 'queued' });
    }

    setDraft('');
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const startResize = (panel) => (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panel === 'contacts' ? panelSizes.contacts : panelSizes.preferences;
    const limits = panelLimits[panel];

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(limits.max, Math.max(limits.min, startWidth + delta));

      setPanelSizes((prev) => ({
        ...prev,
        [panel]: nextWidth,
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const layoutStyle = useMemo(
    () => ({
      '--contacts-width': `${panelSizes.contacts}px`,
      '--preferences-width': `${panelSizes.preferences}px`,
      '--sidebar-width': `${sidebarWidth}px`,
    }),
    [panelSizes, sidebarWidth],
  );

  const addQuickReply = (event) => {
    event.preventDefault();
    if (!newReply.trim()) return;
    setQuickReplies((prev) => [...prev, newReply.trim()]);
    setNewReply('');
  };

  const selectInvitation = (invitationKey) => {
    setActiveInvitationKey((prev) => (prev === invitationKey ? null : invitationKey));
    setInvitationActionState({ status: 'idle', message: '' });
  };

  const handleAcceptInvitation = async (invitationId) => {
    if (!invitationId) {
      setInvitationActionState({ status: 'error', message: 'Nie można zaakceptować zaproszenia bez identyfikatora.' });
      return;
    }

    setInvitationActionState({ status: 'loading', message: 'Trwa akceptowanie zaproszenia...' });

    try {
      const response = await apiRequest(`/joker-chat-api/joker-chat/friendships/${invitationId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ accepted: true }),
      });

      if (!response.ok) {
        throw new Error('Nie udało się zaakceptować zaproszenia.');
      }

      setInvitationActionState({ status: 'success', message: 'Zaproszenie zostało zaakceptowane.' });
      fetchInvitations();
    } catch (error) {
      setInvitationActionState({ status: 'error', message: 'Akceptacja zaproszenia nie powiodła się.' });
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!invitationId) {
      setInvitationActionState({ status: 'error', message: 'Nie można usunąć zaproszenia bez identyfikatora.' });
      return;
    }

    setInvitationActionState({ status: 'loading', message: 'Trwa usuwanie zaproszenia...' });

    try {
      const response = await apiRequest(`/joker-chat-api/joker-chat/friendships/${invitationId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Nie udało się usunąć zaproszenia.');
      }

      setInvitationActionState({ status: 'success', message: 'Zaproszenie zostało usunięte.' });
      fetchInvitations();
    } catch (error) {
      setInvitationActionState({ status: 'error', message: 'Usunięcie zaproszenia nie powiodło się.' });
    }
  };

  return (
    <div className="chat-layout" style={layoutStyle}>
      <aside className="chat-sidebar">
        <div className="sidebar__header">
          <div>
            <p className="muted">Panel czatu</p>
            <strong>Twoje centrum rozmów</strong>
          </div>
          <span className="pill pill-outline">Live</span>
        </div>

        <div className="sidebar__section">
          <p className="muted">Status połączenia</p>
          <div className="sidebar__status-card">
            <div className="sidebar__status-row">
              <span className={socketStatus === 'open' ? 'status-dot online' : 'status-dot offline'} />
              <div>
                <strong>{socketStatus === 'open' ? 'Połączono' : 'Oczekiwanie na połączenie'}</strong>
                <p className="muted">{socketError || 'Kanał WebSocket jest monitorowany.'}</p>
              </div>
            </div>
            <div className="sidebar__status-meta">
              <span className="pill">ID: {userId || 'Nieznany'}</span>
              <span className="pill pill-outline">Kontakty: {contacts.length}</span>
            </div>
          </div>
        </div>

        <div className="sidebar__section">
          <p className="muted">Skróty</p>
          <div className="sidebar__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setDraft('Hej! Masz chwilę na rozmowę?')}
            >
              Przywitaj się
            </button>
            <button type="button" className="ghost-button" onClick={() => fetchInvitations()}>
              Odśwież zaproszenia
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => selected && setDraft(`Cześć ${getContactDisplayName(selectedContact)}!`)}
              disabled={!selectedContact}
            >
              Personalizuj wiadomość
            </button>
          </div>
        </div>

        <div className="sidebar__section sidebar__tiles">
          <div className="sidebar__tile">
            <p className="muted">Zaproszenia</p>
            <strong>{invitationCounters.total}</strong>
            <span className="pill pill-outline">{invitationCounters.pending} oczekuje</span>
          </div>
          <div className="sidebar__tile">
            <p className="muted">Szybkie odpowiedzi</p>
            <strong>{quickReplies.length}</strong>
            <span className="pill">do użycia</span>
          </div>
          <div className="sidebar__tile">
            <p className="muted">Preferencje</p>
            <strong>{preferences.theme}</strong>
            <span className="pill">{preferences.notifications ? 'Powiadomienia on' : 'Powiadomienia off'}</span>
          </div>
        </div>
      </aside>

      <div className="resize-handle" aria-hidden="true">
        <span className="handle-line" />
      </div>

      <aside className="contacts resizable-panel">
        <div className="contacts__header">Kontakty</div>
        {contactsLoading && <p className="muted">Ładowanie kontaktów...</p>}
        {contactsError && <p className="error-text">{contactsError}</p>}
        {!contactsLoading && !contactsError && !contacts.length && <p className="muted">Brak kontaktów do wyświetlenia.</p>}
        <ul>
          {contacts.map((contact, index) => {
            const contactKey = getContactKey(contact, index);
            const isActive = selected === contactKey;
            const unreadCount = unreadByContact[contactKey?.toString?.() ?? contactKey];
            const contactStatus = getContactStatus(contact);

            return (
              <li
                key={contactKey}
                className={isActive ? 'contact active' : 'contact'}
                onClick={() => setSelected(contactKey)}
              >
                <div className="avatar">
                  <MordkaPreview config={contact.friend_mordka} size={64} />
                </div>
                <div>
                  <div className="contact-name">{contact.friend_display_name || 'Nieznany znajomy'}</div>
                  <div className="contact-preview">{contact.friend_opis || 'Brak opisu'}</div>
                </div>
                <div className="contact-meta">
                  {unreadCount ? <span className="contact-badge">{unreadCount}</span> : null}
                  <span className={`status-dot ${contactStatus.className}`} title={contactStatus.label} />
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="resize-handle" aria-hidden="true" onMouseDown={startResize('contacts')}>
        <span className="handle-line" />
      </div>

      <section className="chat-window">
        <header className="chat-header">
          <div className="chat-header__intro">
            <div className="chat-title">Czat</div>
            <p className="subtitle">Czat można dostosowywać — ustaw powiadomienia, dźwięki i układ wiadomości.</p>
          </div>
          <div className="chat-header__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => loadMessages({ limit: 'all', markAsArchive: true })}
              disabled={!selectedContact || messagesLoading || archiveLoading}
            >
              {archiveLoading ? 'Ładowanie archiwum...' : 'Archiwum wiadomości'}
            </button>
          </div>
        </header>

        <div className="connection-bar">
          <div className="connection-summary">
            <div className="connection-label">Identyfikator użytkownika</div>
            <div className="connection-value">{userId || '—'}</div>
          </div>
          <div className="connection-status pill pill-outline">
            <span className={socketStatus === 'open' ? 'status-dot online' : 'status-dot offline'} />
            <span>
              {socketStatus === 'open'
                ? 'Połączono z WebSocket'
                : socketStatus === 'connecting'
                  ? 'Łączenie...'
                  : socketStatus === 'error'
                    ? 'Błąd połączenia'
                    : 'Rozłączono'}
            </span>
          </div>
        </div>

        {socketError && <p className="error-text">{socketError}</p>}

        <div className="messages" ref={messagesContainerRef}>
          {messagesLoading && <p className="muted">Ładowanie wiadomości...</p>}
          {messagesError && <p className="error-text">{messagesError}</p>}
          {messages.map((message, index) => {
            const messageKey = message.id ?? index;

            return (
              <div
                key={messageKey}
                className={message.from === 'Ty' ? 'message outgoing' : 'message incoming'}
              >
                <div className="message-meta">
                  <strong>{message.from}</strong>
                  <span>{message.time}</span>
                  {message.status && (
                    <span className={message.status === 'queued' ? 'pill pill-outline' : 'pill'}>
                      {message.status === 'queued'
                        ? 'Oczekuje na połączenie'
                        : 'Wysłano'}
                    </span>
                  )}
                </div>
                <p>{message.content}</p>
              </div>
            );
          })}
          {!messagesLoading && !messages.length && !messagesError && <p className="muted">Brak wiadomości.</p>}
        </div>

        <form className="message-form" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Napisz wiadomość..."
          />
          <button type="submit" className="primary-button" disabled={!draft.trim()}>
            Wyślij
          </button>
        </form>

        <div className="quick-replies">
          <p className="muted">Szybkie odpowiedzi</p>
          <div className="quick-replies__chips">
            {quickReplies.map((reply) => (
              <button key={reply} type="button" className="ghost-button" onClick={() => setDraft(reply)}>
                {reply}
              </button>
            ))}
          </div>
          <form className="quick-replies__form" onSubmit={addQuickReply}>
            <input
              type="text"
              placeholder="Dodaj kolejną presetową wiadomość"
              value={newReply}
              onChange={(event) => setNewReply(event.target.value)}
            />
            <button type="submit" className="primary-button" disabled={!newReply.trim()}>
              Dodaj
            </button>
          </form>
        </div>
      </section>

      <div className="resize-handle" aria-hidden="true" onMouseDown={startResize('preferences')}>
        <span className="handle-line" />
      </div>

      <aside className="chat-preferences resizable-panel">
        <div className="pref-header">
          <div>
            <p className="muted">Ustawienia czatu</p>
            <strong>Dostosuj zachowanie</strong>
          </div>
          <span className="badge">Live</span>
        </div>

        <div className="preferences-grid">
          <div className="pref-row">
            <div>
              <strong>Powiadomienia</strong>
              <p className="muted">Poinformuj mnie o nowych wiadomościach.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={() => togglePreference('notifications')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="pref-row">
            <div>
              <strong>Dźwięk</strong>
              <p className="muted">Krótki sygnał dźwiękowy dla ważnych kontaktów.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={preferences.sound} onChange={() => togglePreference('sound')} />
              <span className="slider" />
            </label>
          </div>

          <div className="pref-row">
            <div>
              <strong>Widok kompaktowy</strong>
              <p className="muted">Ściśnij odstępy w wątku czatu.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={preferences.compact} onChange={() => togglePreference('compact')} />
              <span className="slider" />
            </label>
          </div>

          <div className="pref-row">
            <div>
              <strong>Podgląd pisania</strong>
              <p className="muted">Wyświetlaj, gdy ktoś pisze wiadomość.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={preferences.typingPreview}
                onChange={() => togglePreference('typingPreview')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="pref-row select-row">
            <div>
              <strong>Motyw</strong>
              <p className="muted">Wybierz styl okna rozmowy.</p>
            </div>
            <select
              value={preferences.theme}
              onChange={(event) => setPreferences((prev) => ({ ...prev, theme: event.target.value }))}
            >
              <option value="ciemny">Ciemny</option>
              <option value="kontrastowy">Kontrastowy</option>
              <option value="pastelowy">Pastelowy</option>
            </select>
          </div>
        </div>

        <div className="pref-summary">
          <p className="muted">Podgląd ustawień</p>
          <ul>
            <li>
              <span>Powiadomienia</span>
              <strong>{preferences.notifications ? 'Włączone' : 'Wyłączone'}</strong>
            </li>
            <li>
              <span>Dźwięk</span>
              <strong>{preferences.sound ? 'Włączony' : 'Wyłączony'}</strong>
            </li>
            <li>
              <span>Widok</span>
              <strong>{preferences.compact ? 'Kompaktowy' : 'Standardowy'}</strong>
            </li>
            <li>
              <span>Podgląd pisania</span>
              <strong>{preferences.typingPreview ? 'Widzoczny' : 'Ukryty'}</strong>
            </li>
            <li>
              <span>Motyw</span>
              <strong className="pill pill-outline">{preferences.theme}</strong>
            </li>
          </ul>
        </div>

        <div className="pref-summary invitations-section">
          <p className="muted">Otrzymane zaproszenia</p>

          <div className="invitations-overview">
            <div className="overview-row">
              <div className="overview-card">
                <span className="muted">Łącznie</span>
                <strong>{invitationCounters.total}</strong>
              </div>
              <div className="overview-card">
                <span className="muted">Oczekujące</span>
                <strong>{invitationCounters.pending}</strong>
              </div>
              <div className="overview-card">
                <span className="muted">Zaakceptowane</span>
                <strong>{invitationCounters.accepted}</strong>
              </div>
              <div className="overview-card">
                <span className="muted">Odrzucone</span>
                <strong>{invitationCounters.rejected}</strong>
              </div>
            </div>

            <div className="overview-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => fetchInvitations()}
                disabled={invitationsLoading}
              >
                {invitationsLoading ? 'Odświeżanie...' : 'Odśwież dane'}
              </button>
              {lastInvitationsUpdate && (
                <span className="muted">Ostatnie pobranie: {lastInvitationsUpdate}</span>
              )}
            </div>
          </div>

          {invitationsLoading && <p>Ładowanie zaproszeń...</p>}
          {invitationsError && <p className="error-text">{invitationsError}</p>}

          {!invitationsLoading && !invitationsError && !invitations.length && (
            <p className="muted">Brak nowych zaproszeń.</p>
          )}

          {!!invitations.length && (
            <ul className="invitations-list">
              {invitations.map((invitation, index) => {
                const invitationKey = invitation.id ?? invitation.uuid ?? index;
                const isActive = invitationKey === activeInvitationKey;
                const inviterName = getInviterName(invitation);

                return (
                  <li
                    key={invitationKey}
                    className={isActive ? 'invitation-item active' : 'invitation-item'}
                    onClick={() => selectInvitation(invitationKey)}
                  >
                    <div className="invitation-row">
                      <div className="invitation-avatar">
                        <MordkaPreview config={getInvitationMordka(invitation)} size={140} />
                      </div>

                      <div className="invitation-content">
                        <div className="invitation-header">
                          <div>
                            <p className="muted small-text invitation-from-label">Zaproszenie od</p>
                            <strong>{inviterName}</strong>
                          </div>
                          <div className="invitation-meta">
                            {getCreatedLabel(invitation) && (
                              <span className="pill">{getCreatedLabel(invitation)}</span>
                            )}
                            <span className="pill pill-outline">{resolveStatus(invitation)}</span>
                          </div>
                        </div>

                        {invitation.friend_message || invitation.message ? (
                          <p className="muted">{invitation.friend_message || invitation.message}</p>
                        ) : (
                          <p className="muted">Zaproszenie do znajomych czeka na Twoją reakcję.</p>
                        )}

                        <dl className="invitation-details">
                          {invitation.uuid && (
                            <div>
                              <dt>UUID</dt>
                              <dd>{invitation.uuid}</dd>
                            </div>
                          )}
                          {invitation.receiver && (
                            <div>
                              <dt>Odbiorca</dt>
                              <dd>{invitation.receiver}</dd>
                            </div>
                          )}
                          {inviterName && (
                            <div>
                              <dt>Zapraszający</dt>
                              <dd>{inviterName}</dd>
                            </div>
                          )}
                          {invitation.role && (
                            <div>
                              <dt>Rola</dt>
                              <dd>{invitation.role}</dd>
                            </div>
                          )}
                        </dl>

                        {isActive && (
                          <div className="invitation-actions">
                            <p className="muted">
                              Wybierz, czy zaakceptować zaproszenie czy je usunąć. Operacje wykonają odpowiednie
                              wywołania API.
                            </p>
                            <div className="invitation-actions__buttons">
                              <button
                                type="button"
                                className="primary-button"
                                disabled={invitationActionState.status === 'loading'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAcceptInvitation(invitation.id);
                                }}
                              >
                                {invitationActionState.status === 'loading'
                                  ? 'Przetwarzanie...'
                                  : 'Zaakceptuj zaproszenie'}
                              </button>
                              <button
                                type="button"
                                className="danger-button"
                                disabled={invitationActionState.status === 'loading'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteInvitation(invitation.id);
                                }}
                              >
                                Usuń zaproszenie
                              </button>
                            </div>
                            {invitationActionState.message && (
                              <p
                                className={
                                  invitationActionState.status === 'error'
                                    ? 'error-text'
                                    : 'success-text'
                                }
                              >
                                {invitationActionState.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export default ChatPage;
