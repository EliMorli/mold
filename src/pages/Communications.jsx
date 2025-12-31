import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Phone, Mail, Search, User, Calendar, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CommunicationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDirection, setFilterDirection] = useState("All");
  const [selectedConversation, setSelectedConversation] = useState(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-timestamp'),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: []
  });

  // Group messages by conversation
  const conversations = messages.reduce((acc, message) => {
    const convId = message.conversation_id;
    if (!acc[convId]) {
      acc[convId] = {
        id: convId,
        client_id: message.client_id,
        client_name: message.client_name,
        test_id: message.test_id,
        test_number: message.test_number,
        messages: [],
        lastMessage: message,
        unreadCount: 0
      };
    }
    acc[convId].messages.push(message);
    return acc;
  }, {});

  const conversationList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
  );

  // Apply filters
  const filteredConversations = conversationList.filter(conv => {
    const matchesSearch = conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.test_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "All" || 
                       conv.messages.some(m => m.message_type === filterType);
    
    const matchesDirection = filterDirection === "All" || 
                            conv.messages.some(m => m.direction === filterDirection);
    
    return matchesSearch && matchesType && matchesDirection;
  });

  const messageTypeColors = {
    'SMS': 'bg-blue-100 text-blue-700',
    'Email': 'bg-purple-100 text-purple-700',
    'Call': 'bg-green-100 text-green-700',
    'WhatsApp': 'bg-emerald-100 text-emerald-700',
    'Internal': 'bg-gray-100 text-gray-700'
  };

  const directionColors = {
    'Inbound': 'bg-orange-100 text-orange-700',
    'Outbound': 'bg-cyan-100 text-cyan-700'
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Communications Center
            </h1>
            <p className="text-gray-500 mt-1">{messages.length} total messages across {conversationList.length} conversations</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['SMS', 'Email', 'Call', 'WhatsApp', 'Internal'].map((type) => {
          const count = messages.filter(m => m.message_type === type).length;
          return (
            <div key={type} className="clay-card rounded-2xl p-4">
              <p className="text-sm text-gray-500 mb-1">{type}</p>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Conversations</h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 clay-button rounded-2xl border-0"
              />
            </div>

            {/* Filters */}
            <div className="space-y-2 mb-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDirection} onValueChange={setFilterDirection}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue placeholder="Filter by direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Directions</SelectItem>
                  <SelectItem value="Inbound">Inbound</SelectItem>
                  <SelectItem value="Outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conversation List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-all ${
                      selectedConversation?.id === conv.id ? 'clay-nav-active' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-400" />
                        <p className="font-semibold text-gray-800 text-sm">{conv.client_name}</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatTimestamp(conv.lastMessage.timestamp)}</span>
                    </div>
                    {conv.test_number && (
                      <p className="text-xs text-gray-500 mb-2">Test: {conv.test_number}</p>
                    )}
                    <p className="text-xs text-gray-600 truncate">{conv.lastMessage.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${messageTypeColors[conv.lastMessage.message_type]} text-xs rounded-lg px-2 py-0.5`}>
                        {conv.lastMessage.message_type}
                      </Badge>
                      <Badge className={`${directionColors[conv.lastMessage.direction]} text-xs rounded-lg px-2 py-0.5`}>
                        {conv.lastMessage.direction}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Conversation Details */}
        <div className="lg:col-span-2">
          <div className="clay-card rounded-3xl p-6">
            {!selectedConversation ? (
              <div className="text-center py-24">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Conversation Selected</h3>
                <p className="text-gray-500">Select a conversation to view message history</p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{selectedConversation.client_name}</h3>
                      {selectedConversation.test_number && (
                        <p className="text-sm text-gray-500">Test: {selectedConversation.test_number}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{selectedConversation.messages.length} messages</p>
                </div>

                {/* Messages */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {selectedConversation.messages.sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                  ).map((message) => (
                    <div key={message.id} className="clay-button rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {message.message_type === 'SMS' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                          {message.message_type === 'Email' && <Mail className="w-4 h-4 text-purple-400" />}
                          {message.message_type === 'Call' && <Phone className="w-4 h-4 text-green-400" />}
                          <Badge className={`${messageTypeColors[message.message_type]} text-xs rounded-lg px-2 py-0.5`}>
                            {message.message_type}
                          </Badge>
                          <Badge className={`${directionColors[message.direction]} text-xs rounded-lg px-2 py-0.5`}>
                            {message.direction}
                          </Badge>
                          {message.status && (
                            <Badge className="bg-gray-100 text-gray-600 text-xs rounded-lg px-2 py-0.5">
                              {message.status}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{formatFullTimestamp(message.timestamp)}</p>
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          {message.sender_type}: {message.sender_name || 'Unknown'}
                        </p>
                        {message.sender_phone && (
                          <p className="text-xs text-gray-500">Phone: {message.sender_phone}</p>
                        )}
                        {message.sender_email && (
                          <p className="text-xs text-gray-500">Email: {message.sender_email}</p>
                        )}
                      </div>

                      <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>

                      {message.call_duration && (
                        <p className="text-xs text-gray-500 mt-2">
                          Duration: {Math.floor(message.call_duration / 60)}m {message.call_duration % 60}s
                        </p>
                      )}

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="clay-button rounded-lg px-3 py-1 text-xs text-blue-600 hover:scale-105 transition-transform"
                              >
                                View File {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}