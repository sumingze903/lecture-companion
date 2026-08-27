import { useState, useEffect, useRef, useCallback } from "react";
import { translateText } from "@/lib/translation-api";

export interface Sentence {
  id: string;
  timestamp: string;
  english: string;
  chinese: string;
}

const LEARNED_PHRASES_KEY = "lecture_companion_learned_phrases_v1";
const LEARNED_COUNTS_KEY = "lecture_companion_learned_counts_v1";
const AUTO_LEARN_MIN_COUNT = 3;

type PhrasePair = [string, string];

function loadLearnedPhrases(): PhrasePair[] {
  try {
    const raw = localStorage.getItem(LEARNED_PHRASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLearnedPhrases(pairs: PhrasePair[]) {
  try {
    localStorage.setItem(LEARNED_PHRASES_KEY, JSON.stringify(pairs));
  } catch {}
}

function loadLearnedCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LEARNED_COUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLearnedCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(LEARNED_COUNTS_KEY, JSON.stringify(counts));
  } catch {}
}

function normalizeEn(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeZh(text: string): string {
  const chars = ["，", "。", "！", "？", "；", "：", "“", "”", "‘", "’", "（", "）", "(", ")", "[", "]", "{", "}"];
  let result = text;
  for (const ch of chars) {
    result = result.split(ch).join("");
  }
  return result.trim();
}

function hasPhrase(pairs: PhrasePair[], en: string): boolean {
  return pairs.some(([k]) => k === en);
}

function loadAllFallbackPhrases(): PhrasePair[] {
  const learned = loadLearnedPhrases();
  return [...learned, ...FALLBACK_PHRASES];
}

function autoLearnPhraseFromSentence(english: string, chinese: string) {
  const en = normalizeEn(english);
  const zh = normalizeZh(chinese);

  if (!en || !zh) return;
  if (en.split(" ").length < 2) return;
  if (en.split(" ").length > 6) return;

  const allKnown = loadAllFallbackPhrases();
  if (hasPhrase(allKnown, en)) return;

  const looksUseful =
    en.includes(" ") &&
    (
      en.includes("design") ||
      en.includes("management") ||
      en.includes("marketing") ||
      en.includes("finance") ||
      en.includes("strategy") ||
      en.includes("analysis") ||
      en.includes("example") ||
      en.includes("from china") ||
      en.includes("my name is") ||
      en.includes("come from") ||
      en.includes("industrial") ||
      en.includes("student") ||
      en.includes("professor") ||
      en.includes("lecture") ||
      en.includes("course")
    );

  if (!looksUseful) return;
  if (zh.length > 12) return;

  const key = `${en}|||${zh}`;
  const counts = loadLearnedCounts();
  counts[key] = (counts[key] || 0) + 1;
  saveLearnedCounts(counts);

  if (counts[key] < AUTO_LEARN_MIN_COUNT) return;

  const learned = loadLearnedPhrases();
  if (hasPhrase(learned, en)) return;

  learned.unshift([en, zh]);
  saveLearnedPhrases(learned);
}
// ── Fallback dictionary for instant live hints ─────────────────────────────
// Rules:
//  1. Longer phrases listed BEFORE their component words (longest-match wins).
//  2. Common conversational phrases at top so they match immediately.
//  3. Academic / lecture terms follow.
const FALLBACK_PHRASES: [string, string][] = [
  // ── Greetings & self-introduction (highest priority) ──────────────────
  ["hello everyone", "大家好"],
  ["hello there", "你好"],
  ["good morning", "早上好"],
  ["good afternoon", "下午好"],
  ["good evening", "晚上好"],
  ["last sentence", "最后一句"],
  ["first time", "第一次"],
  ["my name is", "我叫"],
  ["my name", "我的名字"],
  ["i come from", "我来自"],
  ["come from", "来自"],
  ["i am from", "我来自"],
  ["from china", "来自中国"],
  ["i'm from", "我来自"],
  ["i am", "我是"],
  ["i'm", "我是"],
  ["we are", "我们是"],
  ["we're", "我们是"],
  ["you are", "你是"],
  ["you're", "你是"],
  ["hello", "你好"],
  ["hi", "你好"],
  ["hey", "嘿"],
  ["china", "中国"],
  ["today", "今天"],
  ["tomorrow", "明天"],
  ["yesterday", "昨天"],
  ["here", "这里"],
  ["there", "那里"],
  ["why", "为什么"],
  ["fast", "快"],
  ["slow", "慢"],
  ["smoothly", "顺利地"],
  ["smooth", "顺利"],
  ["translate", "翻译"],
  ["sentence", "句子"],
  ["word", "单词"],
  ["see", "看"],
  ["know", "知道"],
  ["work", "工作"],
  ["inside", "内部"],
  ["another", "另一个"],
  ["license", "许可证"],
  ["global", "全球"],
  ["name", "名字"],
  ["test", "测试"],
  ["software", "软件"],
  // ── Core pronouns & function words ────────────────────────────────────
  // Listed after phrases so longer matches (e.g. "i am", "my name is") win first
  ["my", "我的"],
  ["your", "你的"],
  ["from", "来自"],
  ["is", "是"],
  ["am", "是"],
  ["are", "是"],
  ["in", "在"],
  ["to", "到"],
  ["i", "我"],
  ["you", "你"],
  // ── Multi-word academic phrases ────────────────────────────────────────
  ["in other words", "换句话说"],
  ["that is to say", "也就是说"],
  ["on the other hand", "另一方面"],
  ["as a result", "因此"],
  ["in conclusion", "总结来说"],
  ["in summary", "总结来说"],
  ["more importantly", "更重要的是"],
  ["as we can see", "正如我们所见"],
  ["for instance", "举例来说"],
  ["for example", "例如"],
  ["such as", "例如"],
  ["that is", "即"],
  ["in addition", "此外"],
  ["at the same time", "同时"],
  ["supply chain", "供应链"],
  ["machine learning", "机器学习"],
  ["deep learning", "深度学习"],
  ["neural network", "神经网络"],
  ["artificial intelligence", "人工智能"],
  ["natural language", "自然语言"],
  ["data structure", "数据结构"],
  ["time complexity", "时间复杂度"],
  ["space complexity", "空间复杂度"],
  ["global trade", "全球贸易"],
  ["human resource", "人力资源"],
  ["market share", "市场份额"],
  ["cost effective", "成本效益"],
  ["case study", "案例研究"],
  ["research paper", "研究论文"],
  ["peer review", "同行评审"],
  ["literature review", "文献综述"],
  // ── Single words — connectors, verbs, academic terms ──────────────────
  ["therefore", "因此"],
  ["however", "然而"],
  ["moreover", "此外"],
  ["furthermore", "此外"],
  ["nevertheless", "尽管如此"],
  ["additionally", "另外"],
  ["consequently", "因此"],
  ["similarly", "类似地"],
  ["alternatively", "或者"],
  ["essentially", "本质上"],
  ["specifically", "具体来说"],
  ["generally", "一般来说"],
  ["basically", "基本上"],
  ["typically", "通常"],
  ["usually", "通常"],
  ["often", "经常"],
  ["sometimes", "有时"],
  ["always", "总是"],
  ["never", "从不"],
  ["because", "因为"],
  ["although", "虽然"],
  ["while", "当…时"],
  ["since", "自从/因为"],
  ["unless", "除非"],
  ["whether", "是否"],
  ["between", "之间"],
  ["through", "通过"],
  ["without", "没有"],
  ["toward", "朝向"],
  ["against", "反对"],
  ["within", "在…内"],
  ["beyond", "超出"],
  ["before", "之前"],
  ["after", "之后"],
  ["during", "在…期间"],
  ["research", "研究"],
  ["analysis", "分析"],
  ["conclusion", "结论"],
  ["evidence", "证据"],
  ["theory", "理论"],
  ["concept", "概念"],
  ["approach", "方法"],
  ["method", "方法"],
  ["process", "过程"],
  ["system", "系统"],
  ["model", "模型"],
  ["structure", "结构"],
  ["function", "功能/函数"],
  ["algorithm", "算法"],
  ["variable", "变量"],
  ["parameter", "参数"],
  ["equation", "方程"],
  ["formula", "公式"],
  ["result", "结果"],
  ["outcome", "结果"],
  ["impact", "影响"],
  ["effect", "影响"],
  ["factor", "因素"],
  ["relationship", "关系"],
  ["correlation", "相关性"],
  ["pattern", "模式"],
  ["trend", "趋势"],
  ["strategy", "策略"],
  ["solution", "解决方案"],
  ["problem", "问题"],
  ["challenge", "挑战"],
  ["example", "例子"],
  ["definition", "定义"],
  ["principle", "原理"],
  ["property", "属性"],
  ["condition", "条件"],
  ["assumption", "假设"],
  ["context", "背景"],
  ["framework", "框架"],
  ["perspective", "观点"],
  ["argument", "论点"],
  ["application", "应用"],
  ["implementation", "实现"],
  ["performance", "性能"],
  ["efficiency", "效率"],
  ["accuracy", "准确性"],
  ["complexity", "复杂性"],
  ["behavior", "行为"],
  ["interaction", "交互"],
  ["distribution", "分布"],
  ["probability", "概率"],
  ["statistics", "统计"],
  ["dataset", "数据集"],
  ["database", "数据库"],
  ["network", "网络"],
  ["software", "软件"],
  ["hardware", "硬件"],
  ["memory", "内存"],
  ["storage", "存储"],
  ["output", "输出"],
  ["input", "输入"],
  ["value", "值"],
  ["object", "对象"],
  ["class", "类"],
  ["interface", "接口"],
  ["module", "模块"],
  ["teacher", "老师"],
  ["important", "重要"],
  ["significant", "显著"],
  ["critical", "关键"],
  ["relevant", "相关"],
  ["effective", "有效"],
  ["efficient", "高效"],
  ["different", "不同"],
  ["similar", "类似"],
  ["common", "常见"],
  ["main", "主要"],
  ["key", "关键"],
  ["primary", "主要"],
  ["based", "基于"],
  ["related", "相关"],
  ["compared", "相比"],
  ["defined", "定义"],
  ["called", "称为"],
  ["known", "已知"],
  ["given", "给定"],
  ["required", "需要"],
  ["means", "意味着"],
  ["represents", "表示"],
  ["refers", "指"],
  ["consists", "由…组成"],
  ["depends", "取决于"],
  ["increases", "增加"],
  ["decreases", "减少"],
  ["allows", "允许"],
  ["provides", "提供"],
  ["contains", "包含"],
  ["describes", "描述"],
  ["shows", "显示"],
  ["includes", "包括"],
  ["involves", "涉及"],
  ["requires", "需要"],
  ["produces", "产生"],
  ["creates", "创建"],
  ["reduces", "减少"],
  ["improves", "改善"],
  ["management", "管理"],
  ["logistics", "物流"],
  ["economics", "经济学"],
  ["biology", "生物学"],
  ["chemistry", "化学"],
  ["physics", "物理学"],
  ["mathematics", "数学"],
  ["psychology", "心理学"],
  ["sociology", "社会学"],
  ["philosophy", "哲学"],
  ["history", "历史"],
  ["literature", "文学"],
  ["business", "商业"],
  ["finance", "金融"],
  ["accounting", "会计"],
  ["marketing", "市场营销"],
  ["engineering", "工程"],
  ["medicine", "医学"],
  ["law", "法律"],
  ["education", "教育"],
  ["technology", "技术"],
  ["science", "科学"],
  ["government", "政府"],
  ["environment", "环境"],
  ["energy", "能量/能源"],
  ["population", "人口"],
  ["economy", "经济"],
  ["society", "社会"],
  ["culture", "文化"],
  ["language", "语言"],
  ["information", "信息"],
  ["knowledge", "知识"],
  ["learning", "学习"],
  ["development", "发展"],
  ["innovation", "创新"],
  ["sustainability", "可持续性"],
  ["growth", "增长"],
  ["change", "变化"],
  ["policy", "政策"],
  ["market", "市场"],
  ["product", "产品"],
  ["service", "服务"],
  ["customer", "客户"],
  ["quality", "质量"],
  ["standard", "标准"],
  ["source", "来源"],
  ["journal", "期刊"],
  ["academic", "学术"],
  ["scientific", "科学"],
  ["publication", "出版/发表"],
  ["experiment", "实验"],
  ["observation", "观察"],
  ["measurement", "测量"],
  ["sample", "样本"],
  ["population", "总体"],
  ["survey", "调查"],
  ["interview", "采访/面试"],
  ["review", "审查/回顾"],
  ["thesis", "论文"],
  ["article", "文章"],
  ["paper", "论文"],
  ["reference", "参考"],
  ["citation", "引用"],
  ["data", "数据"],
  ["graph", "图表"],
  ["chart", "图表"],
  ["table", "表格"],
  ["figure", "图"],
  ["section", "章节"],
  ["chapter", "章节"],
  ["introduction", "介绍"],
  ["background", "背景"],
  ["objective", "目标"],
  ["goal", "目标"],
  ["purpose", "目的"],
  ["scope", "范围"],
  ["limitation", "局限性"],
  ["assumption", "假设"],
  ["finding", "发现"],
  ["suggestion", "建议"],
  ["recommendation", "建议"],
  ["implication", "影响/含义"],
  ["future", "未来"],
  ["next", "下一个"],
  ["first", "第一"],
  ["second", "第二"],
  ["third", "第三"],
  ["finally", "最后"],
  ["today", "今天"],
  ["week", "本周"],
  ["semester", "学期"],
  ["exam", "考试"],
  ["assignment", "作业"],
  ["deadline", "截止日期"],
  ["professor", "教授"],
  ["student", "学生"],
  ["lecture", "讲座"],
  ["class", "课程"],
  ["course", "课程"],
  ["test", "测试"],
  ["quiz", "测验"],
  ["grade", "成绩"],
  ["project", "项目"],
  ["group", "小组"],
  ["team", "团队"],
  ["presentation", "演示"],
  ["discussion", "讨论"],
  ["question", "问题"],
  ["answer", "回答"],
  ["exercise", "练习"],
  ["textbook", "教材"],
  ["chapter", "章"],
  ["page", "页"],
  ["note", "笔记"],
  ["summary", "摘要"],
  ["review", "复习"],
];

// buildFallbackChinese: synchronous, zero-latency live hint.
//
// Scans the English text for known phrases/words (longest match first) and
// assembles a rough Chinese keyword string that updates the instant each new
// word arrives. Not a real sentence — just a directional hint. The AI final
// translation will replace it with a polished sentence when the sentence ends.
//
// Word-boundary aware: "class" will NOT match inside "reclassify", "he" will
// NOT match inside "these", etc. Only whole-word (space-delimited) matches.
//
function buildFallbackChinese(text: string, previous = ""): string {
  if (!text.trim()) return previous;

  const lower = text.toLowerCase();
  const sortedPhrases = [...FALLBACK_PHRASES].sort(
    (a, b) => b[0].length - a[0].length
  );

  const hits: string[] = [];

  const isWordChar = (c: string | undefined) =>
    c !== undefined && /[a-z0-9']/i.test(c);

  let i = 0;

  while (i < lower.length) {
    let matched: { zh: string; end: number } | null = null;

    for (const [en, zh] of sortedPhrases) {
      if (!lower.startsWith(en, i)) continue;

      const end = i + en.length;
      const beforeOk = i === 0 || !isWordChar(lower[i - 1]);
      const afterOk = end === lower.length || !isWordChar(lower[end]);

      if (!beforeOk || !afterOk) continue;

      matched = { zh, end };
      break;
    }

    if (matched) {
      const last = hits[hits.length - 1];
      if (last !== matched.zh) {
        hits.push(matched.zh);
      }
      i = matched.end;
    } else {
      i++;
    }
  }

  if (hits.length === 0) return previous;

  return hits.join(" ");
}

// ── Constants ──────────────────────────────────────────────────────────────
const FINAL_MAX_RETRIES = 4;
const FINAL_RETRY_DELAY_MS = 2500;

// Sentence buffer: instead of committing each isFinal segment immediately,
// accumulate them and flush only after this much silence.
// Short fragments (< MIN_WORDS_TO_FLUSH) use LONG_FLUSH_MS.
// Longer accumulated text uses SHORT_FLUSH_MS.
const SHORT_FLUSH_MS = 800;   // flush quickly once sentence is substantial
const LONG_FLUSH_MS  = 2000;  // wait longer if still a short fragment
const MIN_WORDS_TO_FLUSH = 5; // word count threshold to switch to SHORT flush

export function useTranscription() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [liveEnglish, setLiveEnglish] = useState("");
  const [liveChinese, setLiveChinese] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const activeSentenceIdsRef = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);

  // Refs for Stop-to-finalize logic and hint tracking
  const latestInterimRef = useRef("");   // raw latest interim (for Stop finalize)
  const longestInterimRef = useRef("");  // anti-shrink: longest seen interim
  const liveChineseRef = useRef("");     // mirrors liveChinese for closure reads

  // Sentence buffer: accumulates isFinal segments before committing to history
  const sentenceBufferRef   = useRef(""); // text waiting to be committed
  const sentenceFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep liveChineseRef in sync
  useEffect(() => {
    liveChineseRef.current = liveChinese;
  }, [liveChinese]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // ── Final translation with silent retry ───────────────────────────────────
  //
  // Fires after a sentence is committed. Starts with the live hint as
  // placeholder. AI result replaces it when ready. On repeated failure the
  // placeholder stays — no error ever surfaces to the user.
  //
  const fetchFinalTranslation = useCallback(
    async (
      id: string,
      text: string,
      fallbackChinese: string,
      attempt = 1,
    ): Promise<void> => {
      if (!activeSentenceIdsRef.current.has(id)) return;
      console.log(`[final] attempt ${attempt} — id=${id.slice(0, 8)} text="${text.slice(0, 50)}"`);
      try {
        const result = await translateText({ text, mode: "final" });
        if (result.translation && activeSentenceIdsRef.current.has(id)) {
          console.log(`[final] success — id=${id.slice(0, 8)} zh="${result.translation.slice(0, 60)}"`);
          autoLearnPhraseFromSentence(text, result.translation);
          setSentences((prev) =>
            prev.map((s) => {
              if (s.id === id) {
                console.log(`[final] replacing row id=${id.slice(0, 8)}`);
                return { ...s, chinese: result.translation };
              }
              return s;
            }),
          );
        } else {
          console.warn(`[final] empty translation returned — id=${id.slice(0, 8)}`);
        }
      } catch (err) {
        console.warn(`[final] failed attempt ${attempt} — id=${id.slice(0, 8)}`, err);
        if (attempt < FINAL_MAX_RETRIES) {
          const delay = FINAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[final] retrying in ${delay}ms — id=${id.slice(0, 8)}`);
          setTimeout(
            () => fetchFinalTranslation(id, text, fallbackChinese, attempt + 1),
            delay,
          );
        } else {
          console.warn(`[final] all retries exhausted, keeping hint — id=${id.slice(0, 8)}`);
        }
        // All retries exhausted → fallbackChinese stays, no error shown
      }
    },
    [translateText],
  );

  // ── Commit a finalized sentence ───────────────────────────────────────────
  //
  // Called when:
  //  (a) Speech recognizer emits a final result, or
  //  (b) User clicks Stop with unfinished interim text
  //
  // Immediately writes the sentence to history with:
  //  - English: raw as-recognized (never modified)
  //  - Chinese: current live hint (the fallback from buildFallbackChinese)
  // Then kicks off background AI translation to upgrade the Chinese.
  //
  const handleFinalTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Snapshot live hint before clearing the live row
      const snapshotChinese =
        liveChineseRef.current || buildFallbackChinese(text) || "…";

      // Clear live row
      setLiveEnglish("");
      setLiveChinese("");
      latestInterimRef.current = "";
      longestInterimRef.current = "";

      const id = crypto.randomUUID();
      activeSentenceIdsRef.current.add(id);
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
      });

      console.log(`[commit] id=${id.slice(0, 8)} en="${text.slice(0, 60)}" hint="${snapshotChinese.slice(0, 40)}"`);

      // Commit immediately — English as-is, Chinese = live hint placeholder

      setSentences((prev) => [
        ...prev,
        { id, timestamp, english: text, chinese: snapshotChinese },
      ]);

      // Background: AI upgrades Chinese silently — completely independent of live state
      console.log(`[commit] starting final translation for id=${id.slice(0, 8)}`);
      fetchFinalTranslation(id, text, snapshotChinese);
    },
    [fetchFinalTranslation],
  );

  // ── Speech recognition setup ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported. Please use Google Chrome or Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // flushSentenceBuffer: commit all buffered finalized text as one sentence.
    // Called by a timer after sufficient silence, or immediately on Stop.
    const flushSentenceBuffer = (delay: number) => {
      if (sentenceFlushTimerRef.current) {
        clearTimeout(sentenceFlushTimerRef.current);
      }
      sentenceFlushTimerRef.current = setTimeout(() => {
        sentenceFlushTimerRef.current = null;
        const text = sentenceBufferRef.current.trim();
        sentenceBufferRef.current = "";
        if (text) handleFinalTranscript(text);
      }, delay);
    };

    recognition.onresult = (event: any) => {
      let currentInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Accumulate into buffer instead of committing immediately
          const seg = transcript.trim();
          if (seg) {
            sentenceBufferRef.current = sentenceBufferRef.current
              ? sentenceBufferRef.current + " " + seg
              : seg;
          }
          currentInterim = "";
          longestInterimRef.current = "";
          latestInterimRef.current = "";

          // Schedule flush: longer wait for short fragments, shorter wait once substantial
          const wordCount = sentenceBufferRef.current.trim().split(/\s+/).filter(Boolean).length;
          const delay = wordCount >= MIN_WORDS_TO_FLUSH ? SHORT_FLUSH_MS : LONG_FLUSH_MS;
          flushSentenceBuffer(delay);
        } else {
          currentInterim += transcript;
        }
      }

      // Build the full live display: buffered finals + current unfinished interim
      const bufferPrefix = sentenceBufferRef.current;
      let interimDisplay = "";

      if (currentInterim) {
        const prev = longestInterimRef.current;
        if (currentInterim.length >= prev.length || !prev) {
          longestInterimRef.current = currentInterim;
          interimDisplay = currentInterim;
        } else if (currentInterim.length >= prev.length * 0.6) {
          interimDisplay = longestInterimRef.current;
        } else {
          longestInterimRef.current = currentInterim;
          interimDisplay = currentInterim;
        }
        latestInterimRef.current = currentInterim;
      }

      const fullDisplay = bufferPrefix
        ? interimDisplay ? bufferPrefix + " " + interimDisplay : bufferPrefix
        : interimDisplay;

      if (fullDisplay) {
        setLiveEnglish(fullDisplay);
        // Hint is computed from the full display — gets richer as buffer grows
        const hint = buildFallbackChinese(fullDisplay, liveChineseRef.current);
        if (hint) setLiveChinese(hint);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError(
          "Microphone access denied. Please allow microphone permissions.",
        );
        setIsListening(false);
      }
      // Other errors (network, aborted) → silently ignored, onend restarts if needed
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignore restart race */
        }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ───────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setError("Recording is not supported in this browser.");
      return;
    }

    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStreamRef.current = stream;
    recordingChunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
      setRecordingUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    };

    recorder.start();
    setIsRecording(true);
  };

  const startListening = async () => {
    setError(null);
    longestInterimRef.current = "";
    latestInterimRef.current = "";
    sentenceBufferRef.current = "";

    if (sentenceFlushTimerRef.current) {
      clearTimeout(sentenceFlushTimerRef.current);
      sentenceFlushTimerRef.current = null;
    }

    if (recognitionRef.current && !isListening) {
      try {
        await startRecording();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition", e);
        setError("Could not start microphone capture. Please check browser permissions.");
      }
    }
  };

  const startSystemAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        setError('没有捕获到音频，请重新选择并勾选“共享音频”');
        return;
      }

      stream.getTracks().forEach((track) => track.stop());
      setError("System audio capture is experimental. Current browser speech recognition only supports microphone listening.");
    } catch (err) {
      console.error("❌ 捕获失败", err);
      setError("捕获失败，请重新尝试");
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);

    if (sentenceFlushTimerRef.current) {
      clearTimeout(sentenceFlushTimerRef.current);
      sentenceFlushTimerRef.current = null;
    }

    const buffered = sentenceBufferRef.current.trim();
    const interim =
      longestInterimRef.current || latestInterimRef.current;

    const remaining = buffered
      ? interim.trim()
        ? buffered + " " + interim.trim()
        : buffered
      : interim.trim();

    sentenceBufferRef.current = "";
    longestInterimRef.current = "";
    latestInterimRef.current = "";

    if (remaining) {
      handleFinalTranscript(remaining);
    } else {
      setLiveEnglish("");
      setLiveChinese("");
    }

    recognitionRef.current?.stop();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const clearTranscript = () => {
    activeSentenceIdsRef.current.clear();
    setSentences([]);
    setLiveEnglish("");
    setLiveChinese("");
    longestInterimRef.current = "";
    latestInterimRef.current = "";
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }
  };

  return {
    sentences,
    liveEnglish,
    liveChinese,
    isListening,
    isRecording,
    recordingUrl,
    startListening,
    startSystemAudioCapture,
    stopListening,
    clearTranscript,
    error,
  };
  }
