import { useState, useEffect, useRef, useMemo } from "react";
import { useStore, totalDue, fmtINR, type Customer, type Booking } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import {
  Mic,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Phone,
  MessageCircle,
  Volume2,
  VolumeX,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // e.g. "2026-06-18"
}

type Step =
  | "INIT"         // Initial listening
  | "CUSTOMER"     // Choose customer
  | "SERVICE"      // Select service
  | "COUNT"        // Select saree count
  | "DATE"         // Select delivery date
  | "CONFIRM"      // Confirm booking details
  | "DONE";        // Finished

interface ConversationLine {
  sender: "app" | "user";
  text: string;
  timestamp: Date;
}

export function VoiceBookingAssistant({ isOpen, onClose, initialDate }: Props) {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const addBooking = useStore((s) => s.addBooking);
  const addCustomer = useStore((s) => s.addCustomer);

  const voiceEnabled = settings.voiceFeedbackEnabled ?? true;

  // State Machine variables
  const [step, setStep] = useState<Step>("INIT");
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [chatLog, setChatLog] = useState<ConversationLine[]>([]);
  const [language, setLanguage] = useState<"en-IN" | "ta-IN">("en-IN");

  // Collected Booking variables
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [similarCustomers, setSimilarCustomers] = useState<Customer[]>([]);
  const [service, setService] = useState<"prepleat" | "drape" | null>(null);
  const [sareeCount, setSareeCount] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string | null>(initialDate || null);
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  // New Customer creation flow in conversation
  const [newCustomerName, setNewCustomerName] = useState<string | null>(null);
  const [waitingForPhone, setWaitingForPhone] = useState(false);

  // Web Speech references
  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // Auto scroll chat log
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  // Audio Beep Chime Generator (Web Audio API)
  const playBeep = (type: "start" | "success" | "error") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "start") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); // C6
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "error") {
        osc.frequency.setValueAtTime(220.00, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(196.00, ctx.currentTime + 0.1); // G3
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error("Audio Context Error", e);
    }
  };

  // Text-To-Speech (Speech Synthesis) with Premium Voice Selector & Safety Recoveries
  const speakText = (text: string, callback?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (callback) callback();
      return;
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    window.speechSynthesis.cancel(); // Cancel active speech

    if (!voiceEnabled) {
      if (callback) callback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Premium Voice Selector (Prioritizes Google and Natural Neural voices)
    const voices = window.speechSynthesis.getVoices();
    const desiredLang = language === "ta-IN" ? "ta" : "en";
    
    const matchingVoices = voices.filter((v) => 
      v.lang.toLowerCase().replace("_", "-").startsWith(desiredLang)
    );

    if (matchingVoices.length > 0) {
      // Prioritize Google voices, then Natural/Neural, then Online voices
      const sortedVoices = matchingVoices.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        const aGoogle = aName.includes("google");
        const bGoogle = bName.includes("google");
        if (aGoogle && !bGoogle) return -1;
        if (!aGoogle && bGoogle) return 1;

        const aNeural = aName.includes("natural") || aName.includes("neural");
        const bNeural = bName.includes("natural") || bName.includes("neural");
        if (aNeural && !bNeural) return -1;
        if (!aNeural && bNeural) return 1;

        const aOnline = aName.includes("online") || a.localService === false;
        const bOnline = bName.includes("online") || b.localService === false;
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        return 0;
      });
      utterance.voice = sortedVoices[0];
      console.log("Selected premium voice:", sortedVoices[0].name);
    }
    
    // Adjust rate for natural, fluent speed (slightly slower makes Tamil sound much better)
    utterance.rate = language === "ta-IN" ? 0.9 : 1.0;
    utterance.pitch = 1.0;

    let completed = false;
    const handleSpeechEnd = () => {
      if (completed) return;
      completed = true;
      isSpeakingRef.current = false;
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      if (callback) callback();
    };

    isSpeakingRef.current = true;
    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    // Safety timeout: if speech takes more than 10 seconds, force recover
    speechTimeoutRef.current = setTimeout(() => {
      console.warn("Speech Synthesis safety timeout fired - recovering state");
      window.speechSynthesis.cancel();
      handleSpeechEnd();
    }, 10000);

    window.speechSynthesis.speak(utterance);
  };

  // Add line to dialog list
  const addLog = (sender: "app" | "user", text: string) => {
    setChatLog((prev) => [...prev, { sender, text, timestamp: new Date() }]);
  };

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setRecognizedText(result);
      addLog("user", result);
      handleVoiceInput(result);
    };

    rec.onerror = (e: any) => {
      console.error("Speech Recognition Error", e);
      setIsListening(false);
      if (e.error === "no-speech") {
        speakText(language === "ta-IN" ? "நீங்கள் ஒன்றும் பேசவில்லை. மீண்டும் சொல்லுங்கள்." : "I didn't hear anything. Could you repeat that?", () => {
          startListening();
        });
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, step, selectedCustomer, similarCustomers, service, sareeCount, deliveryDate, newCustomerName, waitingForPhone]);

  // Start Speech Recognition
  const startListening = () => {
    if (isSpeakingRef.current) return;
    if (recognitionRef.current) {
      try {
        playBeep("start");
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    }
  };

  // Cancel Speech
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Conversational prompts trigger based on step changes
  const askNextQuestion = (currentStep: Step) => {
    let promptText = "";

    switch (currentStep) {
      case "INIT":
        promptText = language === "ta-IN" 
          ? "வணக்கம்! யாருக்கு புக்கிங் செய்ய வேண்டும்? புடவை எண்ணிக்கை மற்றும் தேதியையும் சேர்த்துச் சொல்லலாம்."
          : "Hello! Who is the customer? You can also specify the service, count, and date.";
        break;
      case "CUSTOMER":
        if (similarCustomers.length > 0) {
          const names = similarCustomers.map((c, i) => `${i + 1}. ${c.name}`).join(", ");
          promptText = language === "ta-IN"
            ? `${similarCustomers.length} கஸ்டமர்கள் உள்ளனர்: ${names}. இதில் யார்?`
            : `I found multiple customers: ${names}. Which number or name do you mean?`;
        } else if (waitingForPhone) {
          promptText = language === "ta-IN"
            ? `புதிய வாடிக்கையாளர் ${newCustomerName}. அவர்களின் பத்து இலக்க போன் நம்பரைச் சொல்லுங்கள்.`
            : `Adding ${newCustomerName} as a new customer. What is their 10 digit phone number?`;
        } else {
          promptText = language === "ta-IN"
            ? "யாருக்கு புக் செய்ய வேண்டும்? கஸ்டமர் பெயரைச் சொல்லுங்கள்."
            : "Who is the customer? Please say the name.";
        }
        break;
      case "SERVICE":
        promptText = language === "ta-IN"
          ? `${selectedCustomer?.name}-க்கு என்ன சர்வீஸ் செய்ய வேண்டும்? Prepleating-ஆ அல்லது Draping-ஆ?`
          : `For ${selectedCustomer?.name}, which service? Prepleating or Draping?`;
        break;
      case "COUNT":
        promptText = language === "ta-IN"
          ? "எத்தனை புடவைகள் (Sarees)?"
          : "How many sarees?";
        break;
      case "DATE":
        promptText = language === "ta-IN"
          ? "டெலிவரி தேதி எப்போது வேண்டும்?"
          : "What is the delivery date?";
        break;
      case "CONFIRM":
        const svcLabel = service === "prepleat" ? (language === "ta-IN" ? "Prepleating" : "Prepleat") : (language === "ta-IN" ? "Draping" : "Drape");
        const rate = service === "prepleat" 
          ? (selectedCustomer?.kind === "artist" ? (settings.artistPrepleatPrice ?? 300) : (settings.prepleatPrice ?? 350))
          : (selectedCustomer?.kind === "artist" ? (settings.artistDrapePrice ?? 700) : (settings.drapePrice ?? 800));
        const total = (sareeCount ?? 1) * rate;
        
        promptText = language === "ta-IN"
          ? `${selectedCustomer?.name}-க்கு ${sareeCount} புடவைகள் ${svcLabel}, மொத்த தொகை ${fmtINR(total)}. புக்கிங்கை உறுதி செய்யவா?`
          : `Booking ${svcLabel} for ${selectedCustomer?.name} with ${sareeCount} sarees. Total is ${fmtINR(total)}. Should I confirm this booking?`;
        break;
      case "DONE":
        promptText = language === "ta-IN"
          ? "புக்கிங் வெற்றிகரமாகப் பதியப்பட்டது! நன்றி."
          : "Booking confirmed successfully! Thank you.";
        break;
      default:
        return;
    }

    addLog("app", promptText);
    speakText(promptText, () => {
      if (currentStep !== "DONE") {
        setTimeout(startListening, 300);
      } else {
        setTimeout(onClose, 2000);
      }
    });
  };

  // Trigger conversational flow on modal open
  useEffect(() => {
    if (isOpen) {
      setStep("INIT");
      setChatLog([]);
      setSelectedCustomer(null);
      setSimilarCustomers([]);
      setService(null);
      setSareeCount(null);
      setDeliveryDate(initialDate || null);
      setNewCustomerName(null);
      setWaitingForPhone(false);
      
      // Reset speech engine state
      isSpeakingRef.current = false;
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      
      // Delay start to allow overlay animation
      const t = setTimeout(() => {
        askNextQuestion("INIT");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Pre-load voices for Speech Synthesis
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    // Trigger once to cache
    window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  // Fuzzy Name Matcher
  const matchCustomerName = (spokenName: string) => {
    const cleanSpoken = spokenName.toLowerCase().replace(/\s/g, "");
    
    // 1. Exact match search
    const exact = customers.find((c) => c.name.toLowerCase().replace(/\s/g, "") === cleanSpoken);
    if (exact) return { match: exact, list: [] };

    // 2. Fuzzy match search using Levenshtein distance
    const candidates = customers.map((c) => {
      const score = getFuzzyMatchScore(c.name, spokenName);
      return { customer: c, score };
    })
    .filter((cand) => cand.score > 0.65)
    .sort((a, b) => b.score - a.score);

    if (candidates.length === 1) {
      return { match: candidates[0].customer, list: [] };
    } else if (candidates.length > 1) {
      return { match: null, list: candidates.map(c => c.customer) };
    }

    return { match: null, list: [] };
  };

  // Simple Levenshtein fuzzy score (0.0 to 1.0)
  const getFuzzyMatchScore = (s1: string, s2: string): number => {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;

    const track = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j - 1][i] + 1, // deletion
          track[j][i - 1] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    const dist = track[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1.0 : 1.0 - dist / maxLen;
  };

  // Smart Voice Input Parser
  const handleVoiceInput = (text: string) => {
    const lower = text.toLowerCase().trim();

    // Reset voice assistance command
    if (lower === "restart" || lower === "reset" || lower === "திரும்ப ஆரம்பி") {
      setStep("INIT");
      setSelectedCustomer(null);
      setSimilarCustomers([]);
      setService(null);
      setSareeCount(null);
      setDeliveryDate(initialDate || null);
      setNewCustomerName(null);
      setWaitingForPhone(false);
      playBeep("success");
      toast.success("Voice assistant restarted");
      setTimeout(() => askNextQuestion("INIT"), 400);
      return;
    }

    // Step-by-Step Logic
    if (step === "INIT") {
      // 1. Service detection
      let detectedSvc: typeof service = null;
      if (lower.includes("prepleat") || lower.includes("pleat") || lower.includes("மடிப்பு") || lower.includes("மடிக்க")) {
        detectedSvc = "prepleat";
      } else if (lower.includes("drape") || lower.includes("draping") || lower.includes("உடுத்த") || lower.includes("கட்ட")) {
        detectedSvc = "drape";
      }

      // 2. Count detection
      let detectedCount: number | null = null;
      const countMatch = lower.match(/\b(\d+)\b/) || 
                         lower.match(/(one|two|three|four|five|six|seven|eight|nine|ten)/) ||
                         lower.match(/(ஒரு|இரண்டு|மூன்று|நான்கு|ஐந்து|ஆறு|ஏழு|எட்டு|ஒன்பது|பத்து)/);
      if (countMatch) {
        const cStr = countMatch[1] || countMatch[0];
        detectedCount = parseNumber(cStr);
      }

      // 3. Date detection
      const dateVal = parseDateText(lower);
      let detectedDate: string | null = dateVal ? format(dateVal, "yyyy-MM-dd") : null;

      // 4. Customer detection - lookup first word/part of sentence
      // Exclude keywords from name parsing
      const cleanWords = lower
        .replace(/(prepleat|pleat|drape|draping|saree|sarees|sari|delivery|tomorrow|today|day after|booking|book)/g, "")
        .replace(/(மடிப்பு|மடிக்க|கட்ட|உடுத்த|புடவை|தேதி|நாளை|இன்னைக்கு|புக்கிங்)/g, "")
        .trim()
        .split(/\s+/);

      let detectedCust: Customer | null = null;
      let matchesList: Customer[] = [];

      if (cleanWords.length > 0 && cleanWords[0]) {
        const spokenName = cleanWords[0];
        const res = matchCustomerName(spokenName);
        detectedCust = res.match;
        matchesList = res.list;
      }

      // Save parsed variables
      if (detectedSvc) setService(detectedSvc);
      if (detectedCount) setSareeCount(detectedCount);
      if (detectedDate) setDeliveryDate(detectedDate);

      // Determine next conversational step
      if (detectedCust) {
        setSelectedCustomer(detectedCust);
        const next = getNextMissingStep(detectedCust, detectedSvc, detectedCount, detectedDate);
        setStep(next);
        askNextQuestion(next);
      } else if (matchesList.length > 0) {
        setSimilarCustomers(matchesList);
        setStep("CUSTOMER");
        askNextQuestion("CUSTOMER");
      } else if (cleanWords.length > 0 && cleanWords[0]) {
        // No match found - ask to create new customer
        setNewCustomerName(cleanWords[0]);
        setStep("CUSTOMER");
        // Ask to create new
        const promptText = language === "ta-IN"
          ? `${cleanWords[0]} என்ற பெயர் கஸ்டமர்கள் லிஸ்டில் இல்லை. புதிய கஸ்டமராக சேர்க்கவா?`
          : `Customer "${cleanWords[0]}" was not found. Add them as a new customer?`;
        addLog("app", promptText);
        speakText(promptText, () => {
          setTimeout(startListening, 300);
        });
      } else {
        // Did not catch a name
        setStep("CUSTOMER");
        askNextQuestion("CUSTOMER");
      }
      return;
    }

    if (step === "CUSTOMER") {
      // Handling multiple matches list selection
      if (similarCustomers.length > 0) {
        // User could say name or number (e.g. "one", "first", "two")
        const num = parseNumber(lower);
        if (num && num >= 1 && num <= similarCustomers.length) {
          const selected = similarCustomers[num - 1];
          setSelectedCustomer(selected);
          setSimilarCustomers([]);
          const next = getNextMissingStep(selected, service, sareeCount, deliveryDate);
          setStep(next);
          askNextQuestion(next);
        } else {
          // Attempt exact text match on selection list
          const match = similarCustomers.find((c) => lower.includes(c.name.toLowerCase()));
          if (match) {
            setSelectedCustomer(match);
            setSimilarCustomers([]);
            const next = getNextMissingStep(match, service, sareeCount, deliveryDate);
            setStep(next);
            askNextQuestion(next);
          } else {
            speakText(language === "ta-IN" ? "புரிந்துகொள்ள முடியவில்லை. பட்டியலிடப்பட்டுள்ள எண்ணையோ அல்லது பெயரையோ சொல்லுங்கள்." : "Sorry, I didn't get that. Please say the name or list number.", () => {
              setTimeout(startListening, 300);
            });
          }
        }
        return;
      }

      // Handling new customer phone confirmation
      if (waitingForPhone) {
        // Extract 10 digit number
        const digits = lower.replace(/\D/g, "");
        if (digits.length === 10) {
          // Save new customer
          const newCust = addCustomer({
            name: newCustomerName || "Unknown Voice Customer",
            phone: digits,
            kind: "client",
          });
          setSelectedCustomer(newCust);
          setWaitingForPhone(false);
          setNewCustomerName(null);
          playBeep("success");
          toast.success("New customer added");
          
          const next = getNextMissingStep(newCust, service, sareeCount, deliveryDate);
          setStep(next);
          askNextQuestion(next);
        } else {
          speakText(language === "ta-IN" ? "தவறான எண். தயவுசெய்து பத்து இலக்க போன் நம்பரை மீண்டும் சொல்லுங்கள்." : "Invalid number. Please speak the 10-digit number again.", () => {
            setTimeout(startListening, 300);
          });
        }
        return;
      }

      // Asking to create a new customer
      if (newCustomerName) {
        if (lower.includes("yes") || lower.includes("add") || lower.includes("ஆமாம்") || lower.includes("சேர்") || lower.includes("ok")) {
          setWaitingForPhone(true);
          askNextQuestion("CUSTOMER");
        } else {
          // Reject new customer, try asking name again
          setNewCustomerName(null);
          speakText(language === "ta-IN" ? "சரி, புக்கிங் செய்ய கஸ்டமர் பெயரை மீண்டும் சொல்லுங்கள்." : "Alright, please say the customer name again.", () => {
            setTimeout(startListening, 300);
          });
        }
        return;
      }

      // Normal customer selection step
      const res = matchCustomerName(lower);
      if (res.match) {
        setSelectedCustomer(res.match);
        const next = getNextMissingStep(res.match, service, sareeCount, deliveryDate);
        setStep(next);
        askNextQuestion(next);
      } else if (res.list.length > 0) {
        setSimilarCustomers(res.list);
        askNextQuestion("CUSTOMER");
      } else {
        // Prompt to add new customer
        setNewCustomerName(text);
        const promptText = language === "ta-IN"
          ? `"${text}" என்ற பெயர் இல்லை. புதிய கஸ்டமராக சேர்க்கவா?`
          : `"${text}" was not found. Add as a new customer?`;
        addLog("app", promptText);
        speakText(promptText, () => {
          setTimeout(startListening, 300);
        });
      }
      return;
    }

    if (step === "SERVICE") {
      let selectedSvc: typeof service = null;
      if (lower.includes("prepleat") || lower.includes("pleat") || lower.includes("மடிப்பு") || lower.includes("மடிக்க")) {
        selectedSvc = "prepleat";
      } else if (lower.includes("drape") || lower.includes("draping") || lower.includes("உடுத்த") || lower.includes("கட்ட")) {
        selectedSvc = "drape";
      }

      if (selectedSvc) {
        setService(selectedSvc);
        const next = getNextMissingStep(selectedCustomer, selectedSvc, sareeCount, deliveryDate);
        setStep(next);
        askNextQuestion(next);
      } else {
        speakText(language === "ta-IN" ? "தயவுசெய்து Prepleating அல்லது Draping என்று தெளிவாகக் கூறுங்கள்." : "Please choose Prepleating or Draping.", () => {
          setTimeout(startListening, 300);
        });
      }
      return;
    }

    if (step === "COUNT") {
      const num = parseNumber(lower);
      if (num && num >= 1 && num <= 50) {
        setSareeCount(num);
        const next = getNextMissingStep(selectedCustomer, service, num, deliveryDate);
        setStep(next);
        askNextQuestion(next);
      } else {
        speakText(language === "ta-IN" ? "புடவைகளின் எண்ணிக்கையை எண்களில் கூறுங்கள்." : "Please say the number of sarees.", () => {
          setTimeout(startListening, 300);
        });
      }
      return;
    }

    if (step === "DATE") {
      const dateVal = parseDateText(lower);
      if (dateVal) {
        const dateStr = format(dateVal, "yyyy-MM-dd");
        setDeliveryDate(dateStr);
        const next = getNextMissingStep(selectedCustomer, service, sareeCount, dateStr);
        setStep(next);
        askNextQuestion(next);
      } else {
        speakText(language === "ta-IN" ? "டெலிவரி தேதியை தெளிவாகக் கூறுங்கள்." : "Please speak the delivery date clearly.", () => {
          setTimeout(startListening, 300);
        });
      }
      return;
    }

    if (step === "CONFIRM") {
      if (lower.includes("yes") || lower.includes("confirm") || lower.includes("ok") || lower.includes("ஆமாம்") || lower.includes("பண்ணு") || lower.includes("கன்பர்ம்")) {
        confirmAndSaveBooking();
      } else if (lower.includes("no") || lower.includes("cancel") || lower.includes("இல்லை") || lower.includes("வேண்டாம்")) {
        speakText(language === "ta-IN" ? "புக்கிங் ரத்து செய்யப்பட்டது." : "Booking cancelled.", () => {
          onClose();
        });
      } else {
        speakText(language === "ta-IN" ? "புக்கிங் செய்யவா? ஆமாம் அல்லது இல்லை என்று கூறுங்கள்." : "Should I confirm the booking? Say yes or no.", () => {
          setTimeout(startListening, 300);
        });
      }
      return;
    }
  };

  // Get next step depending on missing parameters
  const getNextMissingStep = (
    cust: Customer | null,
    svc: typeof service,
    cnt: number | null,
    dt: string | null
  ): Step => {
    if (!cust) return "CUSTOMER";
    if (!svc) return "SERVICE";
    if (cnt === null) return "COUNT";
    if (!dt) return "DATE";
    return "CONFIRM";
  };

  // Create booking object and save in store
  const confirmAndSaveBooking = () => {
    if (!selectedCustomer || !service || !sareeCount || !deliveryDate) {
      playBeep("error");
      toast.error("Missing booking fields");
      return;
    }

    const rate = service === "prepleat"
      ? (selectedCustomer.kind === "artist" ? (settings.artistPrepleatPrice ?? 300) : (settings.prepleatPrice ?? 350))
      : (selectedCustomer.kind === "artist" ? (settings.artistDrapePrice ?? 700) : (settings.drapePrice ?? 800));
    const totalAmount = sareeCount * rate;

    try {
      addBooking({
        customerId: selectedCustomer.id,
        service,
        sareeCount,
        pricePerSaree: rate,
        totalAmount,
        advancePaid: 0,
        deliveryDate,
        deliveryTime: "10:00", // Default
        status: "pending",
      });
      
      playBeep("success");
      setStep("DONE");
      askNextQuestion("DONE");
    } catch (e) {
      playBeep("error");
      toast.error("Failed to save booking");
      onClose();
    }
  };

  // Helper number parser
  const parseNumber = (text: string): number | null => {
    const clean = text.toLowerCase().trim();
    if (!isNaN(Number(clean))) return Number(clean);

    const map: Record<string, number> = {
      one: 1, first: 1, ஒரு: 1, ஒன்னு: 1,
      two: 2, second: 2, இரண்டு: 2, ரெண்டு: 2,
      three: 3, third: 3, மூன்று: 3, மூணு: 3,
      four: 4, fourth: 4, நான்கு: 4, நாலு: 4,
      five: 5, fifth: 5, ஐந்து: 5, அஞ்சு: 5,
      six: 6, sixth: 6, ஆறு: 6,
      seven: 7, seventh: 7, ஏழு: 7,
      eight: 8, eighth: 8, எட்டு: 8,
      nine: 9, ninth: 9, ஒன்பது: 9,
      ten: 10, tenth: 10, பத்து: 10
    };

    return map[clean] || null;
  };

  // Helper date parser
  const parseDateText = (text: string): Date | null => {
    const clean = text.toLowerCase().trim();
    const now = new Date();
    
    if (clean.includes("today") || clean.includes("இன்னைக்கு") || clean.includes("inniku")) {
      return now;
    }
    if (clean.includes("tomorrow") || clean.includes("நாளைக்கு") || clean.includes("nalaiku")) {
      return addDays(now, 1);
    }
    if (clean.includes("day after") || clean.includes("நாளை மறுநாள்") || clean.includes("nalai marunal")) {
      return addDays(now, 2);
    }
    
    const daysMap: Record<string, number> = {
      sunday: 0, ஞாயிறு: 0,ஞாயிற்றுக்கிழமை: 0,
      monday: 1, திங்கள்: 1,திங்கட்கிழமை: 1,
      tuesday: 2, செவ்வாய்: 2,செவ்வாய்க்கிழமை: 2,
      wednesday: 3, புதன்: 3,புதன்கிழமை: 3,
      thursday: 4, வியாழன்: 4,வியாழக்கிழமை: 4,
      friday: 5, வெள்ளி: 5,வெள்ளிக்கிழமை: 5,
      saturday: 6, சனி: 6,சனிக்கிழமை: 6
    };
    
    for (const [day, idx] of Object.entries(daysMap)) {
      if (clean.includes(day)) {
        const currentDay = now.getDay();
        let diff = idx - currentDay;
        if (diff <= 0) diff += 7;
        return addDays(now, diff);
      }
    }
    
    const monthsMap: Record<string, number> = {
      january: 0, jan: 0, ஜனவரி: 0,
      february: 1, feb: 1, பிப்ரவரி: 1,
      march: 2, mar: 2, மார்ச்: 2,
      april: 3, apr: 3, ஏப்ரல்: 3,
      may: 4, மே: 4,
      june: 5, jun: 5, ஜூன்: 5,
      july: 6, jul: 6, ஜூலை: 6,
      august: 7, aug: 7, ஆகஸ்ட்: 7,
      september: 8, sep: 8, செப்டம்பர்: 8,
      october: 9, oct: 9, அக்டோபர்: 9,
      november: 10, nov: 10, நவம்பர்: 10,
      december: 11, dec: 11, டிசம்பர்: 11
    };

    const dateMatch = clean.match(/(\d{1,2})(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-zA-Z\u0B80-\u0BFF]+)/) ||
                      clean.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-zA-Z\u0B80-\u0BFF]+)\s*(\d{1,2})/);
    
    if (dateMatch) {
      let dayNum = 0;
      let monthName = "";
      
      if (isNaN(Number(dateMatch[1]))) {
        monthName = dateMatch[1];
        dayNum = Number(dateMatch[2]);
      } else {
        dayNum = Number(dateMatch[1]);
        monthName = dateMatch[3] || dateMatch[2];
      }
      
      for (const [m, idx] of Object.entries(monthsMap)) {
        if (monthName.startsWith(m) || m.startsWith(monthName)) {
          const d = new Date();
          d.setMonth(idx);
          d.setDate(dayNum);
          if (d < now && idx < now.getMonth()) {
            d.setFullYear(d.getFullYear() + 1);
          }
          return d;
        }
      }
    }

    return null;
  };

  // Close and clean synthesis
  const handleClose = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    isSpeakingRef.current = false;
    stopListening();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col pt-[calc(env(safe-area-inset-top,0px)+12px)] px-5 pb-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between w-full max-w-md mx-auto mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary animate-pulse">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-display font-bold">Voice Booking</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Active assistant</p>
          </div>
        </div>

        {/* Toggles & Close */}
        <div className="flex items-center gap-1.5">
          {/* Language Switch */}
          <button
            onClick={() => setLanguage(language === "en-IN" ? "ta-IN" : "en-IN")}
            className="px-2.5 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition"
            title="Switch Language"
          >
            {language === "en-IN" ? "English" : "தமிழ்"}
          </button>
          
          {/* Volume toggle */}
          <button
            onClick={() => {
              const next = !voiceEnabled;
              useStore.getState().updateSettings({ voiceFeedbackEnabled: next });
            }}
            className="size-8.5 rounded-full bg-secondary flex items-center justify-center cursor-pointer active:scale-95 transition text-muted-foreground hover:text-foreground"
            title={voiceEnabled ? "Mute Spoken Feedback" : "Unmute Spoken Feedback"}
          >
            {voiceEnabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4" />}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="size-8.5 rounded-full bg-secondary flex items-center justify-center cursor-pointer active:scale-95 transition text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Log Screen */}
      <div className="flex-1 w-full max-w-md mx-auto bg-card border border-border/40 rounded-3xl p-4 overflow-y-auto card-shadow flex flex-col gap-3 min-h-0 mb-4">
        {chatLog.map((log, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs transition duration-300 animate-in slide-in-from-bottom-2",
              log.sender === "app"
                ? "bg-secondary text-foreground self-start rounded-tl-none font-medium leading-relaxed"
                : "bg-primary text-primary-foreground self-end rounded-tr-none font-semibold"
            )}
          >
            <p>{log.text}</p>
            <span className="text-[8px] opacity-60 self-end mt-1 font-mono">
              {format(log.timestamp, "hh:mm:ss a")}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Dynamic Voice Wave Indicator & Action Controls */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center shrink-0">
        
        {/* Dynamic visual options (Manual override chips) */}
        {similarCustomers.length > 0 && (
          <div className="w-full mb-3 flex flex-wrap gap-1.5 justify-center">
            {similarCustomers.map((cust) => (
              <button
                key={cust.id}
                onClick={() => {
                  setSelectedCustomer(cust);
                  setSimilarCustomers([]);
                  const next = getNextMissingStep(cust, service, sareeCount, deliveryDate);
                  setStep(next);
                  askNextQuestion(next);
                }}
                className="bg-card border border-border/60 hover:border-primary px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
              >
                <span>👤 {cust.name}</span>
                <span className="text-[10px] text-muted-foreground">({cust.phone})</span>
              </button>
            ))}
          </div>
        )}

        {/* Suggestion presets when waiting for input */}
        {step === "SERVICE" && !service && (
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => {
                setService("prepleat");
                const next = getNextMissingStep(selectedCustomer, "prepleat", sareeCount, deliveryDate);
                setStep(next);
                askNextQuestion(next);
              }}
              className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition cursor-pointer"
            >
              ✂️ Prepleating
            </button>
            <button
              onClick={() => {
                setService("drape");
                const next = getNextMissingStep(selectedCustomer, "drape", sareeCount, deliveryDate);
                setStep(next);
                askNextQuestion(next);
              }}
              className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition cursor-pointer"
            >
              🥻 Draping
            </button>
          </div>
        )}

        {step === "CONFIRM" && (
          <div className="mb-3 flex gap-2">
            <button
              onClick={confirmAndSaveBooking}
              className="bg-success text-white border border-success/20 px-5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <Check className="size-3.5" /> Confirm
            </button>
            <button
              onClick={() => {
                speakText(language === "ta-IN" ? "புக்கிங் ரத்து செய்யப்பட்டது." : "Booking cancelled.", () => {
                  onClose();
                });
              }}
              className="bg-destructive/15 text-destructive border border-destructive/20 px-5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        )}

        {/* Siri Wave Animation Container */}
        <div className="w-full flex flex-col items-center justify-center p-4 bg-card border border-border/40 rounded-3xl card-shadow">
          <div className="flex items-center justify-center gap-1.5 h-12 mb-2 w-full">
            {(() => {
              const waveColors = [
                "bg-cyan-500 shadow-cyan-500/40",
                "bg-indigo-500 shadow-indigo-500/40",
                "bg-violet-500 shadow-violet-500/40",
                "bg-fuchsia-500 shadow-fuchsia-500/40",
                "bg-rose-500 shadow-rose-500/40",
                "bg-fuchsia-500 shadow-fuchsia-500/40",
                "bg-violet-500 shadow-violet-500/40",
                "bg-indigo-500 shadow-indigo-500/40",
                "bg-cyan-500 shadow-cyan-500/40",
              ];
              const maxHeights = [14, 22, 32, 42, 50, 42, 32, 22, 14];
              return Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-300",
                    isListening ? cn("animate-audio-wave shadow-xs", waveColors[i]) : "h-1 bg-muted-foreground/20"
                  )}
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    "--wave-height": `${maxHeights[i]}px`,
                    height: isListening ? undefined : "4px"
                  } as any}
                />
              ));
            })()}
          </div>

          <style>{`
            @keyframes audio-wave {
              0%, 100% { height: 6px; transform: scaleY(1); }
              50% { height: var(--wave-height, 32px); transform: scaleY(1.1); }
            }
            .animate-audio-wave {
              animation: audio-wave 0.8s ease-in-out infinite;
            }
          `}</style>

          {/* Listening / Microphone Trigger */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "size-14 rounded-full flex items-center justify-center transition-all duration-500 scale-100 active:scale-90 cursor-pointer shadow-lg border",
                isListening
                  ? "bg-gradient-to-tr from-rose-500 to-red-600 text-white border-rose-400/30 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  : "saree-gradient text-white border-gold/20 hover:shadow-primary/20"
              )}
            >
              <Mic className={cn("size-6", isListening && "animate-bounce")} />
            </button>
            
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              {isListening 
                ? (language === "ta-IN" ? "கேட்டுக் கொண்டிருக்கிறது..." : "Listening...") 
                : (language === "ta-IN" ? "பேச தட்டவும்" : "Tap to Speak")}
            </span>
          </div>
        </div>

        {/* Reset & Instructions Bar */}
        <div className="w-full flex items-center justify-between px-3 mt-3.5">
          <button
            onClick={() => handleVoiceInput("reset")}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95 transition cursor-pointer"
          >
            <RotateCcw className="size-3" /> Restart
          </button>
          
          <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
            <HelpCircle className="size-3" /> Say "Restart" or speak step by step.
          </span>
        </div>

      </div>
    </div>
  );
}
