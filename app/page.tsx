"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Check, Sparkles, Zap, Shield, Users, Mic, Clock, Play, Pause, 
  RotateCcw, Send, CheckSquare, Square, Plus, Trash2, ExternalLink, 
  FileText, ArrowRight, Tag, HelpCircle, User, FileDown, Lock
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { toast } from "sonner"

export default function HomePage() {
  const { user } = useAuth()
  const { isPro } = useSubscription()
  const brandColor = "#760716" // Burgundy single source of truth

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // --- INTERACTIVE DEMO STATES ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<"summary" | "transcript" | "chat" | "export">("summary")
  
  // Speakers list (editable!)
  const [speakers, setSpeakers] = useState({
    spk1: "Sarah (Product Manager)",
    spk2: "John (Dev Lead)",
    spk3: "Emma (UX Designer)"
  })
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [editingSpeakerVal, setEditingSpeakerVal] = useState("")

  // Action Items (interactive checkboxes, additions, deletions!)
  const [actionItems, setActionItems] = useState([
    { id: 1, text: "Sarah to secure final landing page assets from marketing", assignee: "Sarah", dueDate: "Wed", priority: "High", completed: false },
    { id: 2, text: "John to execute database migration script on staging env", assignee: "John", dueDate: "Tue AM", priority: "High", completed: true },
    { id: 3, text: "Emma to test new player micro-animations on Safari browser", assignee: "Emma", dueDate: "Thu", priority: "Medium", completed: false },
    { id: 4, text: "Schedule review meeting for Safari testing results", assignee: "Sarah", dueDate: "Fri", priority: "Low", completed: false }
  ])
  const [newActionText, setNewActionText] = useState("")
  const [newActionAssignee, setNewActionAssignee] = useState("Sarah")

  // Chatbot (presets + interactive input)
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "ai", text: string }>>([
    { sender: "user", text: "What is the primary deadline decided in this meeting?" },
    { sender: "ai", text: "The primary deadline discussed is Friday, for shipping the new landing page designs." }
  ])

  // Syncing states
  const [notionSyncing, setNotionSyncing] = useState(false)
  const [docsSyncing, setDocsSyncing] = useState(false)

  // Transcript segments with timestamps and durations
  const transcriptSegments = [
    { id: 1, start: 0, end: 14, speakerId: "spk1", text: "Hey everyone! Let's review the launch schedule for the new landing page designs. We want to ship by Friday if possible." },
    { id: 2, start: 15, end: 31, speakerId: "spk2", text: "The core components are ready. However, we're still waiting on the assets from marketing. If we get them by Wednesday, Friday is doable." },
    { id: 3, start: 32, end: 47, speakerId: "spk1", text: "Excellent. I will talk to the marketing team today to get those assets over. What about the database migration?" },
    { id: 4, start: 48, end: 64, speakerId: "spk2", text: "The migration script is tested and approved. I'll execute it during the staging deployment tomorrow morning." },
    { id: 5, start: 65, end: 80, speakerId: "spk3", text: "I've updated the micro-animations for the recording player. They look extremely premium now. Let's make sure we test them on Safari." },
    { id: 6, start: 81, end: 95, speakerId: "spk1", text: "Awesome! Let's verify the layout on Safari tomorrow. Thanks everyone, let's make this launch a success." }
  ]

  const totalDuration = 95 // 1m 35s
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Manage custom simulated player ticking
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false)
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, playbackSpeed])

  // Get segment active status
  const getActiveSegmentId = () => {
    const active = transcriptSegments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    )
    return active ? active.id : null
  }

  // Format time (e.g. 75 -> 01:15)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remain = secs % 60
    return `${mins.toString().padStart(2, "0")}:${remain.toString().padStart(2, "0")}`
  }

  // Handle speaker renaming
  const startRenameSpeaker = (id: string, currentVal: string) => {
    setEditingSpeakerId(id)
    setEditingSpeakerVal(currentVal)
  }

  const saveRenameSpeaker = () => {
    if (editingSpeakerId && editingSpeakerVal.trim()) {
      setSpeakers(prev => ({
        ...prev,
        [editingSpeakerId]: editingSpeakerVal.trim()
      }))
      toast.success("Speaker updated globally in this session!")
    }
    setEditingSpeakerId(null)
  }

  // Handle Action Items
  const toggleActionItem = (id: number) => {
    setActionItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const deleteActionItem = (id: number) => {
    setActionItems(prev => prev.filter(item => item.id !== id))
    toast.success("Action item deleted")
  }

  const addActionItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newActionText.trim()) return
    const newItem = {
      id: Date.now(),
      text: newActionText.trim(),
      assignee: newActionAssignee,
      dueDate: "Soon",
      priority: "Medium",
      completed: false
    }
    setActionItems(prev => [...prev, newItem])
    setNewActionText("")
    toast.success("Added new custom task!")
  }

  // Handle Chatbot questions
  const askChatQuestion = (text: string) => {
    if (!text.trim()) return
    const updatedHistory = [...chatHistory, { sender: "user" as const, text }]
    setChatHistory(updatedHistory)
    setChatInput("")

    // Generates high fidelity context-aware mock answers
    setTimeout(() => {
      let aiText = "I couldn't find details on that in the meeting transcript. Can you rephrase?"
      const lowercase = text.toLowerCase()

      if (lowercase.includes("migration") || lowercase.includes("database")) {
        aiText = `According to **${speakers.spk2}**, the database migration script is tested and approved. He plans to execute it tomorrow morning during the staging deployment.`
      } else if (lowercase.includes("safari") || lowercase.includes("browser") || lowercase.includes("emma")) {
        aiText = `**${speakers.spk3}** updated the player micro-animations. She noted they look premium and recommended testing them thoroughly on **Safari** browser tomorrow.`
      } else if (lowercase.includes("marketing") || lowercase.includes("assets") || lowercase.includes("wednesday")) {
        aiText = `**${speakers.spk2}** mentioned they are waiting on marketing assets. If marketing delivers them by **Wednesday**, the Friday launch is on track. **${speakers.spk1}** promised to contact marketing today to speed this up.`
      } else if (lowercase.includes("who is") || lowercase.includes("speakers") || lowercase.includes("present")) {
        aiText = `There are 3 speakers present in this weekly sync:\n1. **${speakers.spk1}** (Product Manager, leading the sync)\n2. **${speakers.spk2}** (Dev Lead, handling components & migrations)\n3. **${speakers.spk3}** (UX Designer, working on micro-animations)`
      } else if (lowercase.includes("summary") || lowercase.includes("tldr") || lowercase.includes("overview")) {
        aiText = `Here is a summary of the sync:\n- **Goal**: Ship landing page by Friday.\n- **Blocker**: Waiting for marketing assets by Wednesday.\n- **Database**: Migration script is approved and goes live on staging tomorrow.\n- **UI/UX**: Micro-animations are done, Safari testing is scheduled for tomorrow.`
      }

      setChatHistory([...updatedHistory, { sender: "ai" as const, text: aiText }])
    }, 800)
  }

  // Export flows
  const triggerNotionSync = () => {
    setNotionSyncing(true)
    setTimeout(() => {
      setNotionSyncing(false)
      toast.success("Successfully exported to your Notion workspace!", {
        description: "Page created under 'Meetings Database'"
      })
    }, 1500)
  }

  const triggerDocsSync = () => {
    setDocsSyncing(true)
    setTimeout(() => {
      setDocsSyncing(false)
      toast.success("Successfully sent to Google Docs!", {
        description: "Saved as 'Product Team Weekly Sync - Summary'"
      })
    }, 1500)
  }

  const triggerPDFDownload = () => {
    toast.info("Generating PDF file...")
    setTimeout(() => {
      window.print()
    }, 500)
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-white">
      <Navigation />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[10%] w-96 h-96 bg-violet-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Revolutionizing Productivity
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-balance">
              Never Take Meeting <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-violet-500">
                Notes Ever Again
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
              Record any meeting or lecture on your browser. Get an instant, structured AI summary with speaker-diarized transcripts, key decisions, and checkable action items in seconds.
            </p>

            {/* Call To Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="px-8 py-6 text-base font-semibold text-white shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all" style={{ backgroundColor: brandColor }} asChild>
                <Link href={user ? "/listen" : "/auth/signup"}>
                  {user ? "Go to Workspace" : "Start Recording Free"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-6 text-base font-semibold border-border hover:bg-secondary/50 transition-colors" asChild>
                <Link href="#demo">Try Live Demo</Link>
              </Button>
            </div>

            {/* Hero Quick Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-16 border-t border-border/50">
              <div className="p-4 rounded-xl bg-card/30 border border-border/50">
                <div className="text-3xl font-extrabold text-foreground">99.2%</div>
                <div className="text-xs text-muted-foreground mt-1">Transcription Accuracy</div>
              </div>
              <div className="p-4 rounded-xl bg-card/30 border border-border/50">
                <div className="text-3xl font-extrabold text-foreground">{'<'} 15s</div>
                <div className="text-xs text-muted-foreground mt-1">AI Note Generation</div>
              </div>
              <div className="p-4 rounded-xl bg-card/30 border border-border/50">
                <div className="text-3xl font-extrabold text-foreground">100k+</div>
                <div className="text-xs text-muted-foreground mt-1">Meetings Summarized</div>
              </div>
              <div className="p-4 rounded-xl bg-card/30 border border-border/50">
                <div className="text-3xl font-extrabold text-foreground">$0</div>
                <div className="text-xs text-muted-foreground mt-1">Free Trial (No Card Required)</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="py-24 border-y border-border/40 bg-secondary/10 relative">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Productive features to supercharge your workflow</h2>
            <p className="text-muted-foreground font-light">Everything you need to turn raw audio into actionable documentation.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Browser Recording</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Capture lectures or online meetings directly in your browser with real-time Speech Recognition and sound level waveforms. Or drag and drop pre-recorded files.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Speaker Diarization</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Our advanced AI distinguishes between multiple voices, applying speaker timestamps. You can rename speaker profiles once and update the entire meeting globally.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant AI Summaries</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Get an executive TLDR, structured outline of key decisions, and checkable action items with automatic assignee tagging in a single click.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Ask AI Meeting Assistant</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Ask specific questions about who said what, why certain decisions were made, or prompt the AI assistant to draft a follow-up email based on the sync.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <ExternalLink className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">One-Click SaaS Export</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Seamlessly sync and write your structured notes into Notion workspaces or Google Docs with polished loading feedback, or copy full clean Markdown.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: brandColor }}>
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">History Search & Filter</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Never lose a detail. Quickly filter your repository of notes by category, date, and search full transcript contents for specific keywords.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO SANDBOX */}
      <section id="demo" className="py-24 relative">
        <div className="container mx-auto px-6 max-w-6xl">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-xs font-semibold text-primary">
              <Play className="w-3 h-3 fill-current" />
              HIFI Sandbox
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Try the Interactive Dashboard</h2>
            <p className="text-muted-foreground font-light">Experience the full power of our notes workspace directly inside the browser sandbox below.</p>
          </div>

          {/* MAIN DASHBOARD MOCKUP CONTAINER */}
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-w-5xl mx-auto flex flex-col md:h-[650px] relative">
            
            {/* Mockup Header bar */}
            <div className="border-b border-border bg-muted/30 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-primary/20 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg leading-none">Product Team Weekly Sync</h3>
                    <div className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 flex items-center gap-1 border border-emerald-500/20">
                      <Tag className="w-2.5 h-2.5" />
                      Sync
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Recorded on May 20, 2026 • Duration: 01:35</p>
                </div>
              </div>

              {/* Mockup audio controls */}
              <div className="flex items-center gap-2 bg-secondary/80 px-4 py-2 rounded-xl border border-border/80 w-full sm:w-auto justify-between sm:justify-start">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full hover:bg-muted text-foreground transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current text-primary" />}
                </button>
                <button 
                  onClick={() => setCurrentTime(0)}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset Track"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono tabular-nums px-2 select-none">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
                
                {/* Simulated speed button */}
                <button 
                  onClick={() => {
                    const speeds = [1, 1.25, 1.5, 2]
                    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
                    setPlaybackSpeed(speeds[nextIdx])
                  }}
                  className="px-2 py-1 bg-background text-[10px] font-mono font-bold rounded-lg border border-border/50 hover:bg-muted transition-colors"
                  title="Change playback speed"
                >
                  {playbackSpeed}x
                </button>
              </div>
            </div>

            {/* Custom Interactive Waveform Track */}
            <div className="px-6 py-3 bg-muted/10 border-b border-border flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Soundwave</span>
              <div className="flex-grow h-6 flex items-end gap-[2px]">
                {mounted && Array.from({ length: 70 }).map((_, idx) => {
                  const percent = currentTime / totalDuration
                  const isActive = idx / 70 <= percent
                  // Generate pseudo-random soundwave height that pulses when playing
                  const baseHeight = 10 + Math.sin(idx * 0.4) * 8 + Math.cos(idx * 0.2) * 6
                  const randomHeight = isPlaying ? baseHeight + Math.sin(Date.now() + idx) * 3 : baseHeight
                  const heightVal = Math.max(4, Math.min(24, randomHeight))

                  return (
                    <div
                      key={idx}
                      className="flex-grow rounded-sm transition-all duration-300"
                      style={{
                        height: `${heightVal}px`,
                        backgroundColor: isActive ? brandColor : "rgba(255,255,255,0.08)",
                        opacity: isActive ? 1 : 0.4
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Main Sandbox Inner Content */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
              
              {/* Left tab selectors */}
              <div className="w-full md:w-48 border-r border-border bg-muted/10 flex md:flex-col overflow-x-auto md:overflow-x-visible md:p-3 gap-1 p-2 shrink-0">
                <button 
                  onClick={() => setActiveTab("summary")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === "summary" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  AI Summary
                </button>
                <button 
                  onClick={() => setActiveTab("transcript")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === "transcript" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  <Mic className="w-4 h-4 shrink-0" />
                  Transcript Timeline
                </button>
                <button 
                  onClick={() => setActiveTab("chat")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === "chat" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  Ask AI Assistant
                </button>
                <button 
                  onClick={() => setActiveTab("export")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === "export" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  Export Notes
                </button>
              </div>

              {/* Middle Dynamic Area */}
              <div className="flex-grow p-6 overflow-y-auto bg-card">
                
                {/* --- AI SUMMARY TAB --- */}
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    {/* TLDR card */}
                    <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        Executive TLDR Summary
                      </div>
                      <p className="text-sm leading-relaxed font-light text-foreground/90">
                        The product team reviewed schedules to ship the new landing page by **Friday**. The launch depends on receiving marketing assets by **Wednesday**, which Sarah will secure today. John verified the staging database migration script is ready to run tomorrow morning, and Emma completed UI player animations which need browser compatibility testing on Safari.
                      </p>
                    </div>

                    {/* Decisions log */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Decisions & Highlights</h4>
                      <ul className="space-y-2.5 text-sm">
                        <li className="flex gap-2.5 items-start">
                          <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">D</div>
                          <span className="font-light">
                            Target release set for **Friday**, subject to marketing delivering assets on time.
                          </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">D</div>
                          <span className="font-light">
                            The database migration script will go live on staging **tomorrow morning**.
                          </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">D</div>
                          <span className="font-light">
                            UX micro-animations must undergo cross-platform verification on **Safari** before release.
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Interactive Action items list */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interactive Action Items</h4>
                        <span className="text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded font-mono font-bold">
                          {actionItems.filter(a => a.completed).length}/{actionItems.length} Done
                        </span>
                      </div>
                      
                      {/* Action items checklist */}
                      <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                        {actionItems.map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between gap-3 p-2 hover:bg-card/85 rounded-lg group/item transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => toggleActionItem(item.id)}
                                className="text-primary hover:scale-105 transition-transform shrink-0"
                              >
                                {item.completed ? (
                                  <CheckSquare className="w-5 h-5 text-primary fill-primary/10" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground/60" />
                                )}
                              </button>
                              <span className={`text-sm font-light leading-snug ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {item.text}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Assignee pill */}
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">
                                {item.assignee}
                              </span>
                              {/* Priority pill */}
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${item.priority === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                {item.priority}
                              </span>
                              <button 
                                onClick={() => deleteActionItem(item.id)}
                                className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Action Item form */}
                      <form onSubmit={addActionItem} className="flex gap-2 pt-2">
                        <input 
                          type="text" 
                          placeholder="Add new action item..." 
                          value={newActionText}
                          onChange={(e) => setNewActionText(e.target.value)}
                          className="flex-grow text-xs rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <select
                          value={newActionAssignee}
                          onChange={(e) => setNewActionAssignee(e.target.value)}
                          className="text-xs bg-muted/40 rounded-xl border border-border px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="Sarah">Sarah</option>
                          <option value="John">John</option>
                          <option value="Emma">Emma</option>
                        </select>
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="text-white rounded-xl shrink-0" 
                          style={{ backgroundColor: brandColor }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>

                  </div>
                )}

                {/* --- TRANSCRIPT TAB --- */}
                {activeTab === "transcript" && (
                  <div className="space-y-6">
                    <div className="p-3 bg-muted/10 border border-border rounded-xl text-xs flex items-center justify-between text-muted-foreground">
                      <span>💡 Click any bubble to seek the player to that timestamp</span>
                      <span className="font-semibold text-primary">Double-click speaker names to rename them</span>
                    </div>

                    {/* Timeline */}
                    <div className="relative pl-4 border-l border-border/80 space-y-6">
                      {transcriptSegments.map((seg) => {
                        const isActive = getActiveSegmentId() === seg.id
                        const speakerName = speakers[seg.speakerId as keyof typeof speakers]

                        return (
                          <div 
                            key={seg.id} 
                            onClick={() => {
                              setCurrentTime(seg.start)
                              if (!isPlaying) setIsPlaying(true)
                            }}
                            className={`relative group/seg cursor-pointer rounded-xl p-3.5 transition-all border ${isActive ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-muted/15'}`}
                          >
                            {/* Glow indicator for playing segment */}
                            {isActive && (
                              <div 
                                className="absolute left-[-21px] top-5 w-2 h-2 rounded-full ring-4 ring-primary/20"
                                style={{ backgroundColor: brandColor }}
                              />
                            )}

                            {/* Speaker & Timestamp header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                
                                {/* Inline Speaker Rename */}
                                {editingSpeakerId === seg.speakerId ? (
                                  <input 
                                    type="text" 
                                    value={editingSpeakerVal}
                                    onChange={(e) => setEditingSpeakerVal(e.target.value)}
                                    onBlur={saveRenameSpeaker}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveRenameSpeaker()
                                    }}
                                    autoFocus
                                    className="text-xs font-bold bg-muted border border-primary px-1.5 py-0.5 rounded focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span 
                                    className="text-xs font-bold hover:text-primary hover:underline select-none"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation()
                                      startRenameSpeaker(seg.speakerId, speakerName)
                                    }}
                                    title="Double-click to rename globally"
                                  >
                                    {speakerName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground group-hover/seg:text-primary transition-colors">
                                {formatTime(seg.start)}
                              </span>
                            </div>

                            {/* Text content */}
                            <p className={`text-sm leading-relaxed font-light ${isActive ? 'text-foreground font-normal' : 'text-muted-foreground hover:text-foreground'}`}>
                              {seg.text}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* --- AI CHAT TAB --- */}
                {activeTab === "chat" && (
                  <div className="flex flex-col h-full space-y-4">
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>Ask AI Assistant questions like <b>'What about database migration?'</b> or <b>'Who is Emma?'</b> to see it fetch contexts.</span>
                    </div>

                    {/* Chat log list */}
                    <div className="flex-grow space-y-3 min-h-[220px]">
                      {chatHistory.map((chat, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[80%] rounded-xl p-3.5 text-sm ${chat.sender === 'user' ? 'bg-secondary border border-border ml-auto rounded-tr-none' : 'bg-primary/5 border border-primary/10 mr-auto rounded-tl-none'}`}
                        >
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                            {chat.sender === 'user' ? 'You' : 'Listen AI'}
                          </span>
                          <p className="font-light leading-relaxed whitespace-pre-line">{chat.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Preset helper suggestions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button 
                        onClick={() => askChatQuestion("What is the marketing asset blocker?")}
                        className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                      >
                        ⏱️ Marketing asset status?
                      </button>
                      <button 
                        onClick={() => askChatQuestion("What about the database migration script?")}
                        className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                      >
                        💾 Database migration plan?
                      </button>
                      <button 
                        onClick={() => askChatQuestion("Who is Emma and what did she do?")}
                        className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                      >
                        🎨 Emma's updates?
                      </button>
                    </div>

                    {/* Input message form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault()
                        askChatQuestion(chatInput)
                      }}
                      className="flex gap-2 border-t border-border pt-4"
                    >
                      <input 
                        type="text" 
                        placeholder="Type question about this meeting..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-grow text-xs rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                      <Button 
                        type="submit" 
                        className="text-white rounded-xl shrink-0" 
                        style={{ backgroundColor: brandColor }}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                )}

                {/* --- EXPORT TAB --- */}
                {activeTab === "export" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Export structured meeting contents</h4>
                    <p className="text-sm font-light text-muted-foreground">Export your meeting summaries and action items into your favorite SaaS platforms seamlessly.</p>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Notion Export Card */}
                      <div className="border border-border/80 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Sync to Notion</span>
                            <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">Popular</span>
                          </div>
                          <p className="text-xs font-light text-muted-foreground leading-relaxed">Save the TLDR, decisions, and checkable action items in a new Notion page.</p>
                        </div>
                        <Button 
                          onClick={triggerNotionSync}
                          disabled={notionSyncing}
                          className="w-full text-xs font-semibold rounded-lg text-white" 
                          style={{ backgroundColor: brandColor }}
                        >
                          {notionSyncing ? "Syncing..." : "Export to Notion Workspace"}
                        </Button>
                      </div>

                      {/* Google Docs Export Card */}
                      <div className="border border-border/80 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Save to Google Docs</span>
                          </div>
                          <p className="text-xs font-light text-muted-foreground leading-relaxed">Send meeting summary directly into a Google Document in your Drive.</p>
                        </div>
                        <Button 
                          onClick={triggerDocsSync}
                          disabled={docsSyncing}
                          className="w-full text-xs font-semibold rounded-lg text-white" 
                          style={{ backgroundColor: brandColor }}
                        >
                          {docsSyncing ? "Sending..." : "Export to Google Docs"}
                        </Button>
                      </div>

                      {/* PDF Export Card */}
                      <div className="border border-border/80 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Print PDF Document</span>
                          </div>
                          <p className="text-xs font-light text-muted-foreground leading-relaxed">Download a beautiful print layout containing all notes and action lists.</p>
                        </div>
                        <Button 
                          onClick={triggerPDFDownload}
                          variant="outline"
                          className="w-full text-xs font-semibold rounded-lg border-border"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>

                      {/* Copy Markdown Card */}
                      <div className="border border-border/80 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Copy Clean Markdown</span>
                          </div>
                          <p className="text-xs font-light text-muted-foreground leading-relaxed">Copies the entire structured note in standard GitHub Flavored Markdown.</p>
                        </div>
                        <Button 
                          onClick={() => {
                            navigator.clipboard.writeText(`
# Product Team Weekly Sync
Recorded on May 20, 2026

## Executive TLDR Summary
The product team reviewed schedules to ship the new landing page by Friday. The launch depends on receiving marketing assets by Wednesday, which Sarah will secure today. John verified the staging database migration script is ready to run tomorrow morning, and Emma completed UI player animations which need browser compatibility testing on Safari.

## Key Decisions
- Target release set for Friday, subject to marketing delivering assets on time.
- The database migration script will go live on staging tomorrow morning.
- UX micro-animations must undergo cross-platform verification on Safari.

## Action Items
${actionItems.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text} (Assignee: ${item.assignee}, Priority: ${item.priority})`).join("\n")}
                            `.trim())
                            toast.success("Markdown copied to clipboard!")
                          }}
                          variant="outline"
                          className="w-full text-xs font-semibold rounded-lg border-border"
                        >
                          Copy Markdown
                        </Button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Sandbox footer watermark gate */}
            {!isPro && (
              <div className="border-t border-border bg-muted/20 px-6 py-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                  Free Tier Preview: Upgrade to remove branding and unlock full AI Chat custom questions.
                </span>
                <Link href="/upgrade">
                  <span className="font-semibold text-primary hover:underline flex items-center gap-1">
                    Upgrade to Pro Plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* PRICING PLANS SECTION */}
      <section className="py-24 border-t border-border/40 bg-secondary/15 relative">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Flexible plans for high-performing teams</h2>
            <p className="text-muted-foreground font-light">Get started for free or upgrade to Pro to unlock unlimited features.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="border border-border/80 rounded-2xl p-8 bg-card flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Free Plan</h3>
                <p className="text-muted-foreground text-sm font-light mb-6">Perfect for students and occasional memo taking.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold">$0</span>
                  <span className="text-muted-foreground text-sm">/ forever</span>
                </div>

                <ul className="space-y-3.5 mb-8">
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    Up to 3 meetings history
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    Max 5 minutes per recording
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    Basic transcript & key decisions
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    Copy clean Markdown export
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light text-muted-foreground/60">
                    <span className="w-4 h-4 text-center select-none shrink-0 font-bold">×</span>
                    Ask AI Meeting Chatbot
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light text-muted-foreground/60">
                    <span className="w-4 h-4 text-center select-none shrink-0 font-bold">×</span>
                    Direct export to Notion & Google Docs
                  </li>
                </ul>
              </div>

              <Button variant="outline" className="w-full py-6 border-border" disabled>
                Current Plan
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="relative border-2 border-primary rounded-2xl p-8 bg-card flex flex-col justify-between shadow-xl">
              <div 
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: brandColor }}
              >
                Recommended
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  Pro Membership
                </h3>
                <p className="text-muted-foreground text-sm font-light mb-6">For professionals, executives, and power users.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold">$9.99</span>
                  <span className="text-muted-foreground text-sm">/ month</span>
                </div>

                <ul className="space-y-3.5 mb-8">
                  <li className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    Unlimited meeting history
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    Unlimited recording duration
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    Advanced speaker profiles renaming
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    Interactive action items editor
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    Interactive **Ask AI Meeting Chatbot**
                  </li>
                  <li className="flex items-center gap-3 text-sm font-light">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    Direct sync to Notion & Google Docs
                  </li>
                </ul>
              </div>

              <Button 
                className="w-full py-6 text-white font-semibold hover:scale-[1.01] transition-transform" 
                style={{ backgroundColor: brandColor }}
                asChild
              >
                <Link href="/upgrade">
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SIGN UP */}
      <section className="py-24 text-center max-w-4xl mx-auto px-6 space-y-8">
        <h2 className="text-4xl md:text-5xl font-extrabold">Ready to automate your notes?</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light">
          Join thousands of productive professionals, developers, and students saving hours of manual labor every single week.
        </p>
        <Button size="lg" className="px-8 py-6 text-base font-semibold text-white hover:scale-[1.02] transition-transform" style={{ backgroundColor: brandColor }} asChild>
          <Link href="/auth/signup">Create Your Free Account</Link>
        </Button>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-border/50 py-12 text-center text-xs text-muted-foreground bg-muted/10">
        <div className="container mx-auto px-6 space-y-4">
          <p>© 2026 Listen AI Inc. All rights reserved. Built with love using Next.js, React 19, and Supabase.</p>
          <div className="flex justify-center gap-6">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
