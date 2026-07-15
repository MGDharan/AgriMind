import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Leaf, Droplets, Bug, BarChart2, RefreshCw, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: Leaf,     text: 'What crops should I sow this month?',       color: '#34d399' },
  { icon: Bug,      text: 'My tomato leaves are turning yellow, why?',  color: '#ef4444' },
  { icon: Droplets, text: 'How much water does paddy need per week?',   color: '#60a5fa' },
  { icon: BarChart2,text: 'Best practices for improving soil health?',  color: '#f59e0b' },
  { icon: Leaf,     text: 'How to prevent fungal disease in wheat?',    color: '#a78bfa' },
  { icon: BarChart2,text: 'When is the right time to harvest cotton?',  color: '#fb923c' },
];

// Simulated AI responses for demo
const AI_RESPONSES: Record<string, string> = {
  default: "I'm AgriMind AI, your intelligent farming assistant. I can help you with crop planning, pest identification, soil management, weather-based decisions, and government schemes. What would you like to know?",
};

function getAIResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('sow') || q.includes('plant') || q.includes('month'))
    return "Based on the current month (July), **Kharif season** is in full swing! 🌱\n\nBest crops to sow now:\n• **Rice (Paddy)** — ideal transplanting window\n• **Maize** — direct sowing possible\n• **Groundnut** — late sowing still viable\n• **Soybean** — excellent window now\n\nMake sure to test soil pH (6.0–7.0) before sowing and apply basal dose of NPK fertilizer.";
  if (q.includes('yellow') || q.includes('leaf') || q.includes('tomato'))
    return "Yellow leaves on tomatoes can indicate several issues 🍃:\n\n**Most likely causes:**\n1. **Nitrogen deficiency** — oldest leaves turn yellow first. Apply urea or compost\n2. **Early Blight** (Alternaria) — yellow halos around brown spots. Spray mancozeb 0.2%\n3. **Overwatering** — check root zone moisture\n4. **Magnesium deficiency** — interveinal yellowing. Apply epsom salt spray (1%)\n\n**Recommended action:** Upload a photo using the Crop Scan page for AI-powered disease identification!";
  if (q.includes('water') || q.includes('paddy') || q.includes('irrigat'))
    return "**Paddy Water Requirements** 💧\n\nWeekly needs by growth stage:\n• **Nursery** — Keep nursery moist, 2–3cm water\n• **Transplanting** — Maintain 5cm flood\n• **Tillering** — 5–7cm, most critical stage\n• **Panicle initiation** — Never let dry, 5–7cm\n• **Grain filling** — 2–3cm water\n• **Maturity** — Drain 10 days before harvest\n\n**Tip:** Alternate Wetting and Drying (AWD) technique can save 30% water with no yield loss!";
  if (q.includes('soil') || q.includes('health') || q.includes('improve'))
    return "**Top 5 Soil Health Practices** 🌍\n\n1. **Green manuring** — Grow dhaincha/sunhemp and plow in\n2. **Vermicompost** — Apply 2–3 tonnes/acre before sowing\n3. **Cover cropping** — Use legumes in off-season to fix nitrogen\n4. **Minimum tillage** — Reduces compaction and preserves soil biology\n5. **pH management** — Test annually; lime for acidic, gypsum for saline soils\n\nVisit the **Soil Lab** page to get AI recommendations based on your soil test results!";
  if (q.includes('fungal') || q.includes('wheat') || q.includes('disease'))
    return "**Wheat Disease Prevention** 🌾\n\nCommon fungal threats:\n• **Yellow/Stripe Rust** — spray Propiconazole 25EC @ 0.1%\n• **Powdery Mildew** — Sulfur dust 25 kg/ha or Karathane\n• **Loose Smut** — Use treated seeds (Carbendazim 2g/kg seed)\n\n**Prevention tips:**\n✓ Use certified disease-free seed\n✓ Seed treatment mandatory before sowing\n✓ Avoid dense sowing (worsens humidity)\n✓ Apply fungicide at flag leaf stage\n✓ Monitor field from tillering onwards";
  if (q.includes('cotton') || q.includes('harvest'))
    return "**Cotton Harvest Timing Guide** ☁️\n\nHarvest indicators:\n• Bolls fully open (50–60% of crop)\n• Locks fluffy and white\n• Stem drying, leaves shedding naturally\n• 140–180 days after sowing (variety dependent)\n\n**Best practices:**\n✓ Harvest in dry morning weather\n✓ Avoid harvesting when dew is present\n✓ Pick in multiple rounds (3–4 pickings)\n✓ Don't mix trash/leaves with lint\n✓ Store in dry, ventilated space\n\nCurrent market price available in the **Market** page!";
  return "That's a great farming question! 🌿 I'm analyzing your query...\n\nFor the most accurate and personalized advice:\n• Use the **Crop Scan** page to identify diseases from photos\n• Check the **Soil Lab** for nutrient recommendations\n• Visit **Weather** for forecasts affecting your decision\n• Browse **Knowledge** for detailed farming guides\n\nCould you provide more details about your crop type, location, or specific problem? I'll give you a more targeted answer!";
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl chat-bubble-ai w-16">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-moss-400"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  // Simple markdown-ish renderer
  const formatText = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <p key={i} className="font-bold text-white mb-1">{line.slice(2, -2)}</p>;
      if (line.startsWith('• '))
        return <p key={i} className="text-gray-300 pl-2">• {line.slice(2)}</p>;
      if (line.startsWith('✓ '))
        return <p key={i} className="text-moss-400 pl-2">✓ {line.slice(2)}</p>;
      if (line.match(/^\d+\./))
        return <p key={i} className="text-gray-300 pl-2">{line}</p>;
      if (line.includes('**'))
        return <p key={i} className="text-gray-300">{line.replace(/\*\*([^*]+)\*\*/g, '$1')}</p>;
      return line ? <p key={i} className="text-gray-300">{line}</p> : <br key={i} />;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-earth-700 border border-earth-600'
          : 'border border-moss-500/30'
      }`}
           style={isUser ? {} : { background: 'linear-gradient(135deg, #059669, #34d399)' }}>
        {isUser ? <User className="w-4 h-4 text-gray-400" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed space-y-0.5 ${
        isUser ? 'chat-bubble-user text-white rounded-tr-sm' : 'chat-bubble-ai rounded-tl-sm'
      }`}>
        {formatText(msg.text)}
        <p className="text-[10px] opacity-50 mt-2">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </motion.div>
  );
}

export function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: AI_RESPONSES.default,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: getAIResponse(text),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    setMessages([{ id: '0', role: 'ai', text: AI_RESPONSES.default, timestamp: new Date() }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)] max-h-[900px] gap-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-4 mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 16px rgba(52,211,153,0.3)', '0 0 32px rgba(52,211,153,0.6)', '0 0 16px rgba(52,211,153,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}
          >
            <Bot className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="font-display font-bold text-white flex items-center gap-2">
              AgriMind AI Advisor
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-moss-400"
              />
            </h1>
            <p className="text-gray-500 text-xs">Intelligent farming guidance, available 24/7</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-earth-800/60 transition-all duration-200"
          title="Clear chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Suggestions */}
      <AnimatePresence>
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <p className="text-gray-600 text-xs mb-2 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300 transition-all duration-200"
                  style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}
                >
                  <s.icon className="w-3 h-3 shrink-0" style={{ color: s.color }} />
                  {s.text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin min-h-0">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-moss-500/30"
                 style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <TypingIndicator />
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-3 mt-4 flex items-center gap-3"
      >
        <input
          className="flex-1 bg-transparent outline-none text-sm text-gray-200 placeholder:text-gray-600"
          placeholder="Ask anything about farming, crops, diseases, weather..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
          style={{
            background: input.trim() ? 'linear-gradient(135deg, #059669, #34d399)' : 'rgba(255,255,255,0.06)',
            boxShadow: input.trim() ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
          }}
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-3.5 h-3.5 text-white" />
          }
        </motion.button>
      </motion.div>
    </div>
  );
}
