import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranscription } from "@/hooks/use-transcription";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  BookOpen,
  Copy,
  Download,
  FileText,
  Headphones,
  Mic,
  Square,
  Trash2,
} from "lucide-react";

function buildLectureSummary(sentences: Array<{ english: string; chinese: string }>) {
  const finalized = sentences.filter((sentence) => sentence.english.trim());
  if (!finalized.length) return "";

  const keywords = finalized
    .flatMap((sentence) =>
      sentence.english
        .toLowerCase()
        .replace(/[^\w\s'-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 5),
    )
    .reduce<Record<string, number>>((acc, word) => {
      acc[word] = (acc[word] ?? 0) + 1;
      return acc;
    }, {});

  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);

  const first = finalized[0];
  const last = finalized[finalized.length - 1];
  const keySentences = finalized.slice(0, 5);

  return [
    `Lecture Summary`,
    ``,
    `Main flow: ${first.english}${last !== first ? ` ... ${last.english}` : ""}`,
    topKeywords.length ? `Keywords: ${topKeywords.join(", ")}` : "",
    ``,
    `Key notes:`,
    ...keySentences.map((sentence, index) => `${index + 1}. ${sentence.english} / ${sentence.chinese}`),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function Home() {
  const {
    sentences,
    liveEnglish,
    liveChinese,
    isListening,
    isRecording,
    recordingUrl,
    startListening,
    stopListening,
    startSystemAudioCapture, 
    clearTranscript,
    error,
  } = useTranscription();

  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState("");
  const summaryText = useMemo(() => buildLectureSummary(sentences), [sentences]);

  // Scroll to bottom whenever a new sentence arrives or live text updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sentences.length, liveEnglish]);

  const handleCopyNotes = () => {
    if (sentences.length === 0) {
      toast({ title: "Nothing to copy", description: "No finalized sentences yet.", variant: "destructive" });
      return;
    }
    const text = sentences
      .map(s => `[${s.timestamp}] ${s.english} | ${s.chinese}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Notes copied!", description: `${sentences.length} sentences copied to clipboard.` });
  };

  const handleGenerateSummary = () => {
    if (!summaryText) {
      toast({ title: "Nothing to summarize", description: "Start a lecture transcript first.", variant: "destructive" });
      return;
    }

    setSummary(summaryText);
    navigator.clipboard.writeText(summaryText);
    toast({ title: "Summary ready", description: "Lecture summary copied to clipboard." });
  };

  const handleDownloadNotes = () => {
    if (sentences.length === 0) {
      toast({ title: "Nothing to download", description: "No finalized sentences yet.", variant: "destructive" });
      return;
    }

    const notes = sentences
      .map(s => `[${s.timestamp}] ${s.english} | ${s.chinese}`)
      .join("\n");
    const blob = new Blob([notes], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lecture-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasContent = sentences.length > 0 || liveEnglish.length > 0 || summary.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 bg-card border-b border-border/60 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-sm text-foreground">Lecture Companion</span>
          {/* Live status pill */}
          {isListening && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2.5 py-1 rounded-md mr-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="sm"
            className="text-xs h-8 px-3"
          >
            {isListening
              ? <><Square className="w-3.5 h-3.5 mr-1.5" fill="currentColor" />Stop</>
              : <><Mic className="w-3.5 h-3.5 mr-1.5" />Start Listening</>
            }
          </Button>
          <Button onClick={startSystemAudioCapture} variant="outline" size="sm" className="text-xs h-8 px-3">
            <Headphones className="w-3.5 h-3.5 mr-1.5" />System Audio
          </Button>

          <Button onClick={handleCopyNotes} variant="outline" size="sm" className="text-xs h-8 px-3">
            <Copy className="w-3 h-3 mr-1.5" />Copy Notes
          </Button>

          <Button onClick={handleDownloadNotes} variant="outline" size="sm" className="text-xs h-8 px-3">
            <Download className="w-3 h-3 mr-1.5" />Notes
          </Button>

          {recordingUrl && (
            <a href={recordingUrl} download={`lecture-recording-${new Date().toISOString().slice(0, 10)}.webm`}>
              <Button variant="outline" size="sm" className="text-xs h-8 px-3">
                <Download className="w-3 h-3 mr-1.5" />Recording
              </Button>
            </a>
          )}

          <Button onClick={handleGenerateSummary} variant="outline" size="sm" className="text-xs h-8 px-3">
            <FileText className="w-3 h-3 mr-1.5" />Summary
          </Button>

          {sentences.length > 0 && (
            <Button
              onClick={clearTranscript}
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* ── COLUMN LABELS ── */}
      <div className="flex-shrink-0 grid grid-cols-2 border-b border-border/60 bg-muted/30">
        <div className="px-6 py-1.5 border-r border-border/60">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">English</span>
        </div>
        <div className="px-6 py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">中文翻译</span>
        </div>
      </div>

      {/* ── TRANSCRIPT AREA ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Empty state */}
        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40">
            <Mic className="w-10 h-10" />
            <p className="text-sm">Press <strong className="font-semibold text-muted-foreground/60">Start Listening</strong> to begin transcribing</p>
          </div>
        )}

        {/* Finalized sentence rows */}
        <AnimatePresence>
          {sentences.map((sentence, i) => (
            <motion.div
              key={sentence.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="group relative grid grid-cols-2 border-b border-border/30 hover:bg-primary/[0.025] transition-colors"
            >
              {/* Timestamp: absolute, zero layout space, appears on hover as overlay badge */}
              <span className="
                absolute left-2 top-1/2 -translate-y-1/2
                opacity-0 group-hover:opacity-100
                transition-opacity duration-150
                text-[9px] font-mono text-muted-foreground/50
                bg-background/90 border border-border/50
                px-1.5 py-0.5 rounded
                pointer-events-none select-none z-10 whitespace-nowrap
              ">
                {sentence.timestamp}
              </span>

              {/* English */}
              <div className="px-6 py-2.5 border-r border-border/30 min-w-0">
                <p className="text-sm leading-relaxed text-foreground">
                  {sentence.english}
                </p>
              </div>

              {/* Chinese */}
              <div className="px-6 py-2.5 min-w-0">
                <p className={`text-sm leading-relaxed ${
                  sentence.chinese === "…"
                    ? "text-muted-foreground/50 italic"
                    : sentence.chinese === "[翻译失败]"
                    ? "text-destructive/60 italic text-xs"
                    : "text-foreground/80"
                }`}>
                  {sentence.chinese}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── LIVE ROW ── active sentence being spoken */}
        {liveEnglish && (
          <div className="grid grid-cols-2 bg-primary/[0.04] border-b border-primary/20">
            {/* Live English */}
            <div className="px-6 py-2.5 border-r border-primary/20 min-w-0">
              <p className="text-sm leading-relaxed text-foreground">
                {liveEnglish}
                {/* Blinking cursor */}
                <span className="inline-block w-[2px] h-[0.85em] bg-foreground/50 ml-0.5 align-middle animate-pulse" />
              </p>
            </div>

            {/* Live Chinese */}
            <div className="px-6 py-2.5 min-w-0">
              {liveChinese ? (
                <p className="text-sm leading-relaxed text-primary/80">
                  {liveChinese}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/40 italic">翻译中…</p>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="border-t border-border/60 bg-card/80 px-6 py-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Lecture Summary
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-border/70 bg-background p-3 text-xs leading-relaxed text-foreground/80">
              {summary}
            </pre>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-6" />
      </div>

      {/* ── STATUS BAR ── */}
      <div className="flex-shrink-0 border-t border-border/60 bg-card px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isListening ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {isRecording ? "Listening and recording" : "Listening"}
            </>
          ) : (
            <span className="opacity-40">Microphone inactive</span>
          )}
        </div>

        {sentences.length > 0 && (
          <span className="text-[11px] text-muted-foreground/50">
            {sentences.length} sentence{sentences.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
