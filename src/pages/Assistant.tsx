import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, MessageSquare, Loader2, Plus, Stethoscope, Activity, Apple, Moon } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: Activity, text: "What does my recent heart rate trend mean?" },
  { icon: Stethoscope, text: "Explain my latest blood pressure reading." },
  { icon: Apple, text: "Suggest a heart-healthy daily meal plan." },
  { icon: Moon, text: "How can I improve my sleep quality?" },
];

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-rag`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit reached. Please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add funds in Cloud > Usage.");
        else toast.error("Assistant unavailable. Please try again.");
        setIsStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let done = false;

      while (!done) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsert(delta);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong.");
    } finally {
      setIsStreaming(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">AI Health Assistant</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Grounded in your vitals and curated medical guidelines.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setMessages([])}>
              <Plus className="h-4 w-4 mr-1" /> New chat
            </Button>
          )}
        </header>

        <Card className="flex-1 flex flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl">
          <ScrollArea className="flex-1" viewportRef={scrollRef as any}>
            <div className="p-4 md:p-6 space-y-6">
              {messages.length === 0 ? (
                <EmptyState onPick={(t) => send(t)} userName={user?.email?.split("@")[0]} />
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {m.role === "assistant" && (
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-vital flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-vital-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted/60 text-foreground rounded-bl-sm border border-border/40"
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-strong:text-foreground">
                            <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isStreaming && messages[messages.length - 1]?.role === "user" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-vital flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-vital-foreground" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 bg-muted/60 border border-border/40 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={onSubmit} className="border-t border-border/60 p-3 md:p-4 bg-background/40">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask about your vitals, symptoms, or health habits…"
                rows={1}
                className="min-h-[44px] max-h-40 resize-none bg-background/60"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="h-11 w-11 shrink-0 bg-gradient-primary"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Educational guidance only — not a substitute for professional medical advice.
            </p>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

function EmptyState({ onPick, userName }: { onPick: (t: string) => void; userName?: string }) {
  return (
    <div className="py-8 md:py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-vital mb-4 shadow-glow"
      >
        <MessageSquare className="h-7 w-7 text-vital-foreground" />
      </motion.div>
      <h2 className="text-xl md:text-2xl font-semibold">
        Hello{userName ? `, ${userName}` : ""} 👋
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        I can analyze your vitals, explain readings, and offer evidence-based wellness tips.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto mt-8">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onPick(s.text)}
              className="text-left p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/40 transition-colors flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{s.text}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}