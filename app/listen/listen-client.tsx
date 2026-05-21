"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { 
  Mic, Square, Pause, Play, UploadCloud, Search, Calendar, Clock, 
  Trash2, Plus, CheckSquare, Square as BlankSquare, Send, Sparkles, 
  ExternalLink, FileText, ChevronRight, Check, FileDown, Lock, 
  User, AlertCircle, RefreshCw, Volume2, Edit3, Tag
} from "lucide-react"
import { toast } from "sonner"

// --- TYPES ---
type TranscriptSegment = {
  id: number
  start: number
  end: number
  speakerId: string
  text: string
}

type Meeting = {
  id: string
  user_id: string
  title: string
  duration: number // seconds
  date: string
  category: "Sync" | "Lecture" | "Brainstorm" | "Memo" | "Interview"
  audio_url?: string
  transcript: TranscriptSegment[]
  summary: {
    tldr: string
    decisions: string[]
  }
  action_items: Array<{
    id: number
    text: string
    assignee: string
    dueDate: string
    priority: "High" | "Medium" | "Low"
    completed: boolean
  }>
  chat_history: Array<{ sender: "user" | "ai"; text: string }>
  created_at: string
}

const CATEGORIES = ["Sync", "Lecture", "Brainstorm", "Memo", "Interview"] as const

export function ListenClient({ user }: { user: any }) {
  const router = useRouter()
  const { isPro, tier } = useSubscription()
  const brandColor = "#760716" // Burgundy single source of truth

  // --- DATA LOADING & PERSISTENCE ---
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All")

  // Workspace Mode: "view" | "record" | "upload"
  const [workspaceMode, setWorkspaceMode] = useState<"view" | "record" | "upload">("view")

  // --- LIVE RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState<string[]>([])
  const [volumeLevel, setVolumeLevel] = useState(0)

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Speech Recognition ref
  const recognitionRef = useRef<any>(null)

  // --- UPLOAD STATE ---
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "transcribing" | "diarizing" | "summarizing" | "done">("idle")

  // --- PLAYBACK & REVIEW STATE ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeDetailTab, setActiveDetailTab] = useState<"summary" | "transcript" | "chat" | "export">("summary")
  
  // Custom Speaker Profiles Map
  const [speakersMap, setSpeakersMap] = useState<Record<string, string>>({
    spk1: "Speaker 1",
    spk2: "Speaker 2",
    spk3: "Speaker 3",
  })
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [editingSpeakerVal, setEditingSpeakerVal] = useState("")

  // Inline Segment Editing
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null)
  const [editingSegmentVal, setEditingSegmentVal] = useState("")

  // New Action item form
  const [newActionText, setNewActionText] = useState("")
  const [newActionAssignee, setNewActionAssignee] = useState("Me")
  const [newActionPriority, setNewActionPriority] = useState<"High" | "Medium" | "Low">("Medium")

  // Chatbot state
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  // Sync animation states
  const [syncNotionActive, setSyncNotionActive] = useState(false)
  const [syncDocsActive, setSyncDocsActive] = useState(false)

  // Refs for tracking ticks
  const playTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize and load meetings from DB/localStorage
  useEffect(() => {
    async function loadData() {
      setIsLoadingMeetings(true)
      try {
        // Query from Supabase
        const { data, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.warn("[ListenClient] DB query error, falling back to LocalStorage:", error)
          loadFallbackData()
        } else if (data && data.length > 0) {
          setMeetings(data as Meeting[])
          setSelectedMeeting(data[0] as Meeting)
        } else {
          // No rows in DB, check LocalStorage or load presets
          loadFallbackData()
        }
      } catch (err) {
        console.error(err)
        loadFallbackData()
      } finally {
        setIsLoadingMeetings(false)
      }
    }

    function loadFallbackData() {
      const localStr = localStorage.getItem(`listen_meetings_${user.id}`)
      if (localStr) {
        const parsed = JSON.parse(localStr)
        setMeetings(parsed)
        if (parsed.length > 0) {
          setSelectedMeeting(parsed[0])
        }
      } else {
        // Create realistic demo presets!
        const presets: Meeting[] = [
          {
            id: "preset_1",
            user_id: user.id,
            title: "Product Launch Review: UI Redesign",
            duration: 95,
            date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
            category: "Sync",
            transcript: [
              { id: 1, start: 0, end: 14, speakerId: "spk1", text: "Hey everyone! Let's review the launch schedule for the new landing page designs. We want to ship by Friday if possible." },
              { id: 2, start: 15, end: 31, speakerId: "spk2", text: "The core components are ready. However, we're still waiting on the assets from marketing. If we get them by Wednesday, Friday is doable." },
              { id: 3, start: 32, end: 47, speakerId: "spk1", text: "Excellent. I will talk to the marketing team today to get those assets over. What about the database migration?" },
              { id: 4, start: 48, end: 64, speakerId: "spk2", text: "The migration script is tested and approved. I'll execute it during the staging deployment tomorrow morning." },
              { id: 5, start: 65, end: 80, speakerId: "spk3", text: "I've updated the micro-animations for the recording player. They look extremely premium now. Let's make sure we test them on Safari." },
              { id: 6, start: 81, end: 95, speakerId: "spk1", text: "Awesome! Let's verify the layout on Safari tomorrow. Thanks everyone, let's make this launch a success." }
            ],
            summary: {
              tldr: "The product team reviewed schedules to ship the new landing page by Friday. The launch depends on receiving marketing assets by Wednesday, which Sarah will secure today. John verified the database migration script is ready, and Emma completed UI player animations which need browser compatibility testing on Safari.",
              decisions: [
                "Target release set for Friday, subject to marketing delivering assets on time.",
                "The database migration script will go live on staging tomorrow morning.",
                "UX micro-animations must undergo cross-platform verification on Safari."
              ]
            },
            action_items: [
              { id: 1, text: "Contact marketing team to secure final landing page assets", assignee: "Sarah", dueDate: "Wed", priority: "High", completed: false },
              { id: 2, text: "Execute database migration script on staging env", assignee: "John", dueDate: "Tue AM", priority: "High", completed: true },
              { id: 3, text: "Test new player micro-animations on Safari browser", assignee: "Emma", dueDate: "Thu", priority: "Medium", completed: false }
            ],
            chat_history: [
              { sender: "user", text: "What is our Friday goal?" },
              { sender: "ai", text: "The team's goal is to officially ship and launch the new landing page designs by Friday." }
            ],
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
          },
          {
            id: "preset_2",
            user_id: user.id,
            title: "Biology 101 Lecture: Cellular Mitosis & Division",
            duration: 185,
            date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
            category: "Lecture",
            transcript: [
              { id: 1, start: 0, end: 40, speakerId: "spk1", text: "Good morning class. Today we are diving into cellular division, specifically Mitosis. Mitosis is the process where a single cell divides into two identical daughter cells." },
              { id: 2, start: 41, end: 90, speakerId: "spk1", text: "Mitosis is divided into four distinct phases: Prophase, Metaphase, Anaphase, and Telophase. Easy to remember with the acronym PMAT." },
              { id: 3, start: 91, end: 140, speakerId: "spk2", text: "Professor, what exactly happens during Metaphase? Is that when chromosomes align?" },
              { id: 4, start: 141, end: 185, speakerId: "spk1", text: "Excellent question! Yes, during Metaphase, the cell's chromosomes align right along the middle plate of the cell, ready to be pulled apart during Anaphase." }
            ],
            summary: {
              tldr: "This lecture introduces cellular mitosis—the process of one cell dividing into two identical daughter cells. The phases are structured in the order of Prophase, Metaphase, Anaphase, and Telophase (PMAT). Special attention was paid to Metaphase where chromosomes align at the cell's center.",
              decisions: [
                "Acronym PMAT was established as the primary mnemonic device for exam prep.",
                "Metaphase is defined as the alignment phase."
              ]
            },
            action_items: [
              { id: 1, text: "Review the PMAT mitosis slides in biology portal", assignee: "Me", dueDate: "Friday Exam", priority: "High", completed: false },
              { id: 2, text: "Read Chapter 4 of biology textbook on Metaphase chromosomes", assignee: "Me", dueDate: "Thu", priority: "Medium", completed: false }
            ],
            chat_history: [],
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
          }
        ]
        setMeetings(presets)
        setSelectedMeeting(presets[0])
        localStorage.setItem(`listen_meetings_${user.id}`, JSON.stringify(presets))
      }
    }

    loadData()
  }, [user.id])

  // Sync to database and localStorage helpers
  const saveMeetingToStore = async (updatedMeeting: Meeting) => {
    // 1. Update State
    const updatedList = meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m)
    setMeetings(updatedList)

    // 2. Persist to Supabase
    try {
      const { error } = await supabase
        .from("meetings")
        .upsert({
          ...updatedMeeting,
          user_id: user.id
        })
      if (error) console.warn("Supabase upsert failed, relying on LocalStorage:", error)
    } catch (err) {
      console.warn("DB offline, saved locally:", err)
    }

    // 3. Persist to LocalStorage Fallback
    localStorage.setItem(`listen_meetings_${user.id}`, JSON.stringify(updatedList))
  }

  const deleteMeetingFromStore = async (meetingId: string) => {
    // 1. Update State
    const filteredList = meetings.filter(m => m.id !== meetingId)
    setMeetings(filteredList)
    if (selectedMeeting?.id === meetingId) {
      setSelectedMeeting(filteredList[0] || null)
    }

    // 2. Delete from Supabase
    try {
      await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId)
    } catch (err) {
      console.warn(err)
    }

    // 3. Delete from LocalStorage Fallback
    localStorage.setItem(`listen_meetings_${user.id}`, JSON.stringify(filteredList))
    toast.success("Meeting deleted successfully")
  }

  // --- AUDIO PLAYBACK TIMING SYNC ---
  useEffect(() => {
    if (isPlaying && selectedMeeting) {
      playTimerRef.current = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= selectedMeeting.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
    }
  }, [isPlaying, selectedMeeting, playbackSpeed])

  // Get active segment during play
  const getActivePlaybackSegmentId = () => {
    if (!selectedMeeting) return null
    const active = selectedMeeting.transcript.find(
      s => playbackTime >= s.start && playbackTime <= s.end
    )
    return active ? active.id : null
  }

  // --- RECORDING VOLUME LEVEL & WAVEFORM GRAPHICS ---
  const startVisualizer = () => {
    if (typeof window === "undefined" || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Animation Loop
    const draw = () => {
      if (!isRecording) return
      
      animationFrameRef.current = requestAnimationFrame(draw)

      ctx.clearRect(0, 0, width, height)

      // Get real audio values if analyser is active
      let valArray: any = new Uint8Array(0)
      if (analyserRef.current) {
        valArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(valArray)
        
        // Compute average volume for numerical display
        let sum = 0
        for (let i = 0; i < valArray.length; i++) {
          sum += valArray[i]
        }
        const avg = sum / valArray.length
        setVolumeLevel(Math.round((avg / 255) * 100))
      }

      ctx.fillStyle = "rgba(118, 7, 22, 0.05)"
      ctx.fillRect(0, 0, width, height)

      // Draw elegant neon waveform bar charts
      const barWidth = 3
      const barGap = 2
      const barCount = Math.floor(width / (barWidth + barGap))

      for (let i = 0; i < barCount; i++) {
        // Compute height from analyser data or simulated sine wave if no mic available
        let amplitude = 0
        if (analyserRef.current && valArray.length > 0) {
          const index = Math.floor((i / barCount) * valArray.length * 0.6)
          amplitude = (valArray[index] || 0) / 255
        } else {
          // Synthetic pulsing wave when mic is muted/paused
          amplitude = isPaused ? 0.05 : 0.15 + Math.sin(Date.now() * 0.005 + i * 0.15) * 0.1 + Math.cos(Date.now() * 0.002 - i * 0.1) * 0.1
        }

        const barHeight = Math.max(4, amplitude * height * 0.95)
        const x = i * (barWidth + barGap)
        const y = (height - barHeight) / 2

        ctx.fillStyle = isPaused ? "rgba(255,255,255,0.2)" : brandColor
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
    }

    draw()
  }

  // Manage custom recording timer ticks
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          // Free Tier limits check: 5 minute max (300 seconds)
          if (!isPro && prev >= 300) {
            handleStopRecording()
            toast.error("Free Tier Limit Reached!", {
              description: "Free recordings are capped at 5 minutes. Upgrade to Pro for unlimited length!"
            })
            return 300
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }

    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [isRecording, isPaused, isPro])

  // --- SPEECH RECOGNITION & RECORDING TRIGGERS ---
  const handleStartRecording = async () => {
    // 1. Subscription Check (Free Tier holds max 3 meetings)
    if (!isPro && meetings.length >= 3) {
      toast.error("Free Meeting Limit Reached!", {
        description: "Your free storage is capped at 3 meetings. Please delete some items or upgrade to Pro to unlock unlimited storage!"
      })
      router.push("/upgrade")
      return
    }

    // 2. Request microphone permission and set up Web Audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
      }

      setIsRecording(true)
      setIsPaused(false)
      setRecordDuration(0)
      setLiveTranscript([])
      setWorkspaceMode("record")

      // Launch real speech recognition if supported!
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = "en-US"

        rec.onresult = (e: any) => {
          const results = Array.from(e.results)
          const typedText = results
            .map((res: any) => res[0].transcript)
            .join(" ")

          // Splice into segments to simulate real-time typing
          const sentences = typedText.split(/[.!?]/).filter(Boolean)
          if (sentences.length > 0) {
            setLiveTranscript(sentences)
          }
        }

        rec.onerror = (err: any) => {
          console.warn("Speech recognition error:", err)
        }

        rec.onend = () => {
          // Auto restart if still recording
          if (isRecording && !isPaused && recognitionRef.current) {
            try { recognitionRef.current.start() } catch(e){}
          }
        }

        recognitionRef.current = rec
        rec.start()
      } else {
        // Fallback simulated script if Web Speech isn't available
        triggerSimulatedLiveTranscript()
      }

      // Trigger waveform drawing
      setTimeout(() => startVisualizer(), 100)
      toast.success("Microphone active! Recording started...")
    } catch (err) {
      console.error("Microphone access rejected:", err)
      toast.error("Microphone Error", {
        description: "Could not access microphone. Please check system permissions."
      })
    }
  }

  // Simulated transcription loop if mic speech recognition is not active
  const triggerSimulatedLiveTranscript = () => {
    const mockSentences = [
      "Hello, testing the audio stream.",
      "The speech model is transcribing our meeting voices.",
      "We are currently reviewing project objectives.",
      "Action items are being extracted automatically by the LLM.",
      "This provides speaker tags with precise timestamps.",
      "Everything aligns perfectly to our product deadlines.",
      "Great job everyone, let's wrap this up."
    ]

    let sentenceIdx = 0
    const interval = setInterval(() => {
      if (!isRecording || isPaused) return
      if (sentenceIdx >= mockSentences.length) {
        clearInterval(interval)
        return
      }

      setLiveTranscript(prev => [...prev, mockSentences[sentenceIdx]])
      sentenceIdx++
    }, 8000)
  }

  const handlePauseRecording = () => {
    setIsPaused(!isPaused)
    if (recognitionRef.current) {
      if (!isPaused) {
        recognitionRef.current.stop()
      } else {
        try { recognitionRef.current.start() } catch(e){}
      }
    }
    toast.info(isPaused ? "Recording resumed" : "Recording paused")
  }

  const handleStopRecording = () => {
    // Clean up streams & audio graphs
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    setIsRecording(false)
    setIsPaused(false)

    // Move to synthesized result generation!
    generateAIResultFromRecord(recordDuration, liveTranscript)
  }

  // --- GENERATING MOCK NOTE-TAKING LOGIC ---
  const generateAIResultFromRecord = (duration: number, recordedSentences: string[]) => {
    toast.success("Recording saved! Generating summaries...")
    
    // Create detailed AI summary based on what was said (or fallbacks)
    const textCollected = recordedSentences.length > 0
      ? recordedSentences.join(". ")
      : "Testing high-performance audio note summaries. Discussed launch milestones, marketing deadlines, and database staging procedures."

    // Set up stages
    setUploadStage("transcribing")
    setWorkspaceMode("upload")
    setUploadProgress(20)

    setTimeout(() => {
      setUploadStage("diarizing")
      setUploadProgress(50)
    }, 1200)

    setTimeout(() => {
      setUploadStage("summarizing")
      setUploadProgress(80)
    }, 2400)

    setTimeout(() => {
      const newMeetingId = "meeting_" + Math.random().toString(36).substr(2, 9)
      
      const newMeeting: Meeting = {
        id: newMeetingId,
        user_id: user.id,
        title: "Voice Memo: " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        duration: duration || 18,
        date: new Date().toISOString(),
        category: "Memo",
        transcript: [
          { id: 1, start: 0, end: Math.floor(duration * 0.4), speakerId: "spk1", text: textCollected },
          { id: 2, start: Math.floor(duration * 0.45), end: duration, speakerId: "spk2", text: "Got it! Thanks for summarizing those items. I'll make sure to get this action list completed by Friday." }
        ],
        summary: {
          tldr: "A live audio memo summarizing the core discussion regarding project schedules. Highlighted the importance of Friday milestones and sync dependencies.",
          decisions: [
            "Conducted mic testing with Web Audio Level meters.",
            "Established a list of upcoming tasks to track before the final release."
          ]
        },
        action_items: [
          { id: 1, text: "Review transcribed memo contents", assignee: "Me", dueDate: "Tomorrow", priority: "Medium", completed: false },
          { id: 2, text: "Sync checklist items with primary team board", assignee: "Me", dueDate: "Friday", priority: "High", completed: false }
        ],
        chat_history: [],
        created_at: new Date().toISOString()
      }

      saveMeetingToStore(newMeeting)
      setSelectedMeeting(newMeeting)
      setWorkspaceMode("view")
      setUploadStage("idle")
      setUploadProgress(0)
      toast.success("AI Summarization complete! Note is live.")
    }, 3600)
  }

  // --- FILE DRAG & DROP UPLOAD FLOW ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File) => {
    // Limit storage check
    if (!isPro && meetings.length >= 3) {
      toast.error("Free Storage Full!", {
        description: "Upgrade to Pro to upload unlimited meetings!"
      })
      router.push("/upgrade")
      return
    }

    // Audio/Video file validation
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      toast.error("Invalid File Type", {
        description: "Please upload an audio (MP3, WAV, M4A) or video (MP4, MOV) file."
      })
      return
    }

    setUploadFile(file)
    setWorkspaceMode("upload")
    setUploadStage("uploading")
    setUploadProgress(10)

    // Simulate progress bar triggers
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 250)

    setTimeout(() => {
      setUploadStage("transcribing")
      setUploadProgress(35)
    }, 1500)

    setTimeout(() => {
      setUploadStage("diarizing")
      setUploadProgress(60)
    }, 3000)

    setTimeout(() => {
      setUploadStage("summarizing")
      setUploadProgress(85)
    }, 4500)

    setTimeout(() => {
      clearInterval(progressInterval)
      setUploadStage("done")
      setUploadProgress(100)

      // Create new imported note
      const importedId = "file_" + Math.random().toString(36).substr(2, 9)
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "") // strip extension

      const newMeeting: Meeting = {
        id: importedId,
        user_id: user.id,
        title: cleanTitle,
        duration: 142, // default 2m 22s
        date: new Date().toISOString(),
        category: "Lecture",
        transcript: [
          { id: 1, start: 0, end: 45, speakerId: "spk1", text: "Welcome back class. Today we're reviewing the syllabus. Let's make sure everyone submits their homework assignment on our portal before Friday." },
          { id: 2, start: 46, end: 95, speakerId: "spk2", text: "Professor, will the assignment cover metaphase and prophase cells? Or is it strictly vocabulary?" },
          { id: 3, start: 96, end: 142, speakerId: "spk1", text: "Yes, it will contain full diagrams of metaphase cells. I suggest reviewing Metaphase chromosome alignments particularly." }
        ],
        summary: {
          tldr: `Imported file note summarizing '${file.name}'. The professor highlighted upcoming homework deadlines for Friday. Students requested clarification on metaphase diagrams, which are confirmed to be a focal point of the assignment slides.`,
          decisions: [
            "Homework assignment submission is locked in for Friday midnight.",
            "Mitosis diagrams are officially confirmed on homework material."
          ]
        },
        action_items: [
          { id: 1, text: "Submit homework assignment on mitosis", assignee: "Me", dueDate: "Fri Midnight", priority: "High", completed: false },
          { id: 2, text: "Study metaphase chromosome alignment diagrams", assignee: "Me", dueDate: "Thu", priority: "Medium", completed: false }
        ],
        chat_history: [],
        created_at: new Date().toISOString()
      }

      saveMeetingToStore(newMeeting)
      setSelectedMeeting(newMeeting)
      setWorkspaceMode("view")
      setUploadStage("idle")
      setUploadProgress(0)
      setUploadFile(null)
      toast.success("Audio file successfully transcribed and synthesized!")
    }, 6000)
  }

  // --- TRANSCRIPT & DETAIL ITEM MUTATORS ---
  const handleRenameSpeaker = () => {
    if (editingSpeakerId && editingSpeakerVal.trim() && selectedMeeting) {
      // Renames name globally in map
      setSpeakersMap(prev => ({
        ...prev,
        [editingSpeakerId]: editingSpeakerVal.trim()
      }))
      toast.success("Speaker updated in this session!")
    }
    setEditingSpeakerId(null)
  }

  const handleUpdateSegmentText = () => {
    if (editingSegmentId !== null && selectedMeeting) {
      const updatedTranscript = selectedMeeting.transcript.map(seg => 
        seg.id === editingSegmentId ? { ...seg, text: editingSegmentVal.trim() } : seg
      )
      const updatedMeeting = {
        ...selectedMeeting,
        transcript: updatedTranscript
      }
      setSelectedMeeting(updatedMeeting)
      saveMeetingToStore(updatedMeeting)
      toast.success("Transcript bubble corrected")
    }
    setEditingSegmentId(null)
  }

  // Handle Action Item Toggles
  const handleToggleAction = (itemId: number) => {
    if (!selectedMeeting) return
    const updatedActions = selectedMeeting.action_items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    const updatedMeeting = { ...selectedMeeting, action_items: updatedActions }
    setSelectedMeeting(updatedMeeting)
    saveMeetingToStore(updatedMeeting)
  }

  const handleDeleteAction = (itemId: number) => {
    if (!selectedMeeting) return
    const updatedActions = selectedMeeting.action_items.filter(item => item.id !== itemId)
    const updatedMeeting = { ...selectedMeeting, action_items: updatedActions }
    setSelectedMeeting(updatedMeeting)
    saveMeetingToStore(updatedMeeting)
    toast.success("Task deleted")
  }

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newActionText.trim() || !selectedMeeting) return

    const newItem = {
      id: Date.now(),
      text: newActionText.trim(),
      assignee: newActionAssignee,
      dueDate: "Soon",
      priority: newActionPriority,
      completed: false
    }

    const updatedMeeting = {
      ...selectedMeeting,
      action_items: [...selectedMeeting.action_items, newItem]
    }
    setSelectedMeeting(updatedMeeting)
    saveMeetingToStore(updatedMeeting)
    setNewActionText("")
    toast.success("Custom task added to meeting!")
  }

  // --- ASK AI CHAT ASSISTANT ---
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedMeeting) return

    // Pro tier gating check for Ask AI
    if (!isPro) {
      toast.error("Pro Feature Locked!", {
        description: "The Ask AI chatbot is a Pro feature. Please upgrade your tier in the pricing page to unlock custom questions!"
      })
      router.push("/upgrade")
      return
    }

    const text = chatInput.trim()
    const updatedHistory = [...(selectedMeeting.chat_history || []), { sender: "user" as const, text }]
    
    const updatedMeetingWithUser = { ...selectedMeeting, chat_history: updatedHistory }
    setSelectedMeeting(updatedMeetingWithUser)
    setChatInput("")
    setChatLoading(true)

    // Generate responsive context-aware responses matching meeting keywords
    setTimeout(() => {
      let aiText = "I examined the meeting transcript but couldn't find specific references to that topic. Could you rephrase your question?"
      const lowercase = text.toLowerCase()
      
      // Sync transcript contents
      const fullText = selectedMeeting.transcript.map(s => s.text).join(" ").toLowerCase()

      if (lowercase.includes("tldr") || lowercase.includes("summary") || lowercase.includes("overview")) {
        aiText = `Here is an overview of this note:\n\n**TLDR**: ${selectedMeeting.summary.tldr}\n\n**Primary decisions include**:\n${selectedMeeting.summary.decisions.map(d => `- ${d}`).join("\n")}`
      } else if (lowercase.includes("action") || lowercase.includes("tasks") || lowercase.includes("todo")) {
        const pending = selectedMeeting.action_items.filter(a => !a.completed)
        if (pending.length > 0) {
          aiText = `There are ${pending.length} pending action items left in this meeting:\n${pending.map(p => `- **${p.text}** (Assignee: ${p.assignee}, Due: ${p.dueDate}, Priority: ${p.priority})`).join("\n")}`
        } else {
          aiText = "All action items in this meeting are fully completed! Outstanding job."
        }
      } else if (lowercase.includes("deadline") || lowercase.includes("schedule") || lowercase.includes("date")) {
        if (fullText.includes("friday")) {
          aiText = "The final milestone / submission deadline established in this meeting is **Friday**."
        } else {
          aiText = "There are no specific future deadlines mentioned in this audio recording. The meeting occurred on " + new Date(selectedMeeting.date).toLocaleDateString()
        }
      } else if (lowercase.includes("who spoke") || lowercase.includes("speaker") || lowercase.includes("voices")) {
        const speakersPresent = Array.from(new Set(selectedMeeting.transcript.map(s => s.speakerId)))
        aiText = `There are ${speakersPresent.length} distinct speakers present in this meeting:\n` + 
          speakersPresent.map((id, index) => `- **${speakersMap[id] || 'Speaker ' + (index+1)}**`).join("\n")
      } else {
        // Fallback keyword checker
        let matches: string[] = []
        selectedMeeting.transcript.forEach(seg => {
          if (seg.text.toLowerCase().includes(lowercase)) {
            const spkName = speakersMap[seg.speakerId] || "A Speaker"
            matches.push(`At **${Math.floor(seg.start / 60)}:${(seg.start % 60).toString().padStart(2, "0")}**, **${spkName}** said: "${seg.text}"`)
          }
        })

        if (matches.length > 0) {
          aiText = `I found some matches in the transcript regarding your query:\n\n` + matches.slice(0, 3).join("\n\n")
        }
      }

      const finalHistory = [...updatedHistory, { sender: "ai" as const, text: aiText }]
      const finalMeeting = { ...selectedMeeting, chat_history: finalHistory }
      
      setSelectedMeeting(finalMeeting)
      saveMeetingToStore(finalMeeting)
      setChatLoading(false)
    }, 1000)
  }

  // --- MOCK SAAS EXPORTS ---
  const handleNotionExport = () => {
    if (!selectedMeeting) return
    setSyncNotionActive(true)
    setTimeout(() => {
      setSyncNotionActive(false)
      toast.success("Successfully pushed to Notion!", {
        description: `Page '${selectedMeeting.title}' created in your database.`
      })
    }, 1500)
  }

  const handleDocsExport = () => {
    if (!selectedMeeting) return
    setSyncDocsActive(true)
    setTimeout(() => {
      setSyncDocsActive(false)
      toast.success("Successfully pushed to Google Docs!", {
        description: "Document saved under 'My Drive / Listen AI Notes'"
      })
    }, 1500)
  }

  const triggerPDFDownload = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  // Search filter matching
  const getFilteredMeetings = () => {
    return meetings.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.transcript.some(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchCategory = selectedCategoryFilter === "All" || m.category === selectedCategoryFilter
      
      return matchSearch && matchCategory
    })
  }

  const filteredMeetings = getFilteredMeetings()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation />

      {/* Main App Workspace */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden border-t border-border/50">
        
        {/* LEFT SIDEBAR: MEETINGS LIST & SEARCH */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border/50 bg-card flex flex-col shrink-0">
          
          {/* Header search bar */}
          <div className="p-4 border-b border-border/50 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <input 
                type="text" 
                placeholder="Search transcripts, titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-xl border border-border bg-muted/30 pl-9 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Quick tag filter scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
              <button 
                onClick={() => setSelectedCategoryFilter("All")}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${selectedCategoryFilter === 'All' ? 'bg-primary text-white border-primary' : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'}`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${selectedCategoryFilter === cat ? 'bg-primary text-white border-primary' : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Core Sidebar Recording actions */}
          <div className="p-4 border-b border-border/50 grid grid-cols-2 gap-3 bg-secondary/15">
            <Button 
              onClick={handleStartRecording}
              className="text-xs py-5 rounded-xl font-semibold text-white hover:scale-[1.02] transition-transform" 
              style={{ backgroundColor: brandColor }}
            >
              <Mic className="w-4 h-4 mr-2 animate-pulse" />
              Record Live
            </Button>
            <Button 
              onClick={() => setWorkspaceMode("upload")}
              variant="outline"
              className="text-xs py-5 rounded-xl font-semibold border-border hover:bg-secondary/80"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Import File
            </Button>
          </div>

          {/* List of Meetings */}
          <div className="flex-grow overflow-y-auto p-3 space-y-2 h-[220px] lg:h-auto">
            {isLoadingMeetings ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-xs">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading notes database...</span>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground font-light space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground/45 mx-auto" />
                <p>No meetings found.</p>
                <p className="text-[10px] text-muted-foreground/60">Try changing filters or click 'Record Live'!</p>
              </div>
            ) : (
              filteredMeetings.map(meeting => {
                const isSelected = selectedMeeting?.id === meeting.id
                return (
                  <div
                    key={meeting.id}
                    onClick={() => {
                      setSelectedMeeting(meeting)
                      setWorkspaceMode("view")
                      setIsPlaying(false)
                      setPlaybackTime(0)
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex justify-between items-start group ${isSelected ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-secondary/40'}`}
                  >
                    <div className="space-y-1.5 flex-grow pr-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`font-bold text-xs truncate leading-none ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {meeting.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-light">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {Math.floor(meeting.duration / 60)}m {(meeting.duration % 60)}s
                        </span>
                        <span>•</span>
                        <span>{new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-secondary text-muted-foreground border border-border">
                        {meeting.category}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMeetingFromStore(meeting.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded text-muted-foreground transition-all"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Sub usage limits card */}
          <div className="p-4 border-t border-border/50 bg-secondary/20">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                Tier Status: {tier === "pro" ? "Pro Member" : "Free Tier"}
              </span>
              {!isPro && (
                <Link href="/upgrade" className="text-primary hover:underline">Upgrade</Link>
              )}
            </div>
            {!isPro && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-light">
                  <span>Storage Used</span>
                  <span>{meetings.length} / 3 meetings</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${(meetings.length / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

        </aside>

        {/* MIDDLE / MAIN PANEL: RECORDING | UPLOADING | DETAIL VIEW */}
        <main className="flex-grow flex flex-col overflow-y-auto bg-card p-6 min-h-[500px]">

          {/* --- WORKSPACE: LIVE RECORDING MODE --- */}
          {workspaceMode === "record" && (
            <div className="max-w-xl w-full mx-auto py-8 space-y-8 flex flex-col justify-center h-full">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Live Recording active
                </div>
                <h2 className="text-3xl font-extrabold">Capturing meeting audio</h2>
                <p className="text-sm text-muted-foreground font-light">Speak clearly. We are transcribing and diarizing voices in real-time.</p>
              </div>

              {/* Volume Display & Waveform Canvas */}
              <div className="space-y-4">
                <div className="border border-border/60 bg-muted/20 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden shadow-inner">
                  {/* Real visualizer canvas */}
                  <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={100}
                    className="w-full h-24 rounded-lg bg-transparent"
                  />
                  
                  {/* Waveform decibel counter */}
                  {volumeLevel > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground absolute top-3 right-4 select-none">
                      dB Meter: {volumeLevel}%
                    </span>
                  )}
                </div>
              </div>

              {/* Timer Duration */}
              <div className="text-center">
                <div className="text-5xl font-mono tracking-tight font-extrabold text-foreground py-2">
                  {Math.floor(recordDuration / 60).toString().padStart(2, "0")}:
                  {(recordDuration % 60).toString().padStart(2, "0")}
                </div>
                {!isPro && (
                  <p className="text-[10px] text-primary font-semibold mt-1">Free cap: 05:00 max duration limit</p>
                )}
              </div>

              {/* Transcription intermediate viewer */}
              <div className="border border-border bg-muted/10 p-5 rounded-2xl space-y-3 h-48 overflow-y-auto">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Real-Time Transcription Stream</h4>
                {liveTranscript.length === 0 ? (
                  <div className="flex items-center justify-center h-28 text-xs text-muted-foreground font-light animate-pulse">
                    Waiting for speech input... Speak to write!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {liveTranscript.map((sent, idx) => (
                      <p key={idx} className="text-sm font-light text-foreground leading-relaxed pl-3 border-l-2 border-primary/45">
                        {sent}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex justify-center gap-4 items-center">
                <button 
                  onClick={handlePauseRecording}
                  className="px-5 py-3 rounded-xl border border-border hover:bg-secondary/60 text-xs font-semibold transition-colors"
                >
                  {isPaused ? "Resume Capturing" : "Pause Audio"}
                </button>
                <Button 
                  onClick={handleStopRecording}
                  className="px-8 py-6 rounded-xl text-sm font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: brandColor }}
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  Stop & Process Summary
                </Button>
              </div>
            </div>
          )}

          {/* --- WORKSPACE: FILE UPLOADER & PROCESSING MODE --- */}
          {workspaceMode === "upload" && (
            <div className="max-w-xl w-full mx-auto py-8 space-y-8 flex flex-col justify-center h-full">
              
              {uploadStage === "idle" ? (
                <>
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-extrabold">Import meeting audio/video</h2>
                    <p className="text-sm text-muted-foreground font-light">Drag in lectures or client call recordings to generate structured transcripts.</p>
                  </div>

                  {/* Drag drop zone */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all flex flex-col items-center justify-center gap-4 ${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/80 hover:border-primary/45 bg-muted/10'}`}
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground mb-2">
                      <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <p className="font-bold text-sm">Drag and drop file here</p>
                      <p className="text-xs text-muted-foreground font-light">Supports MP3, WAV, M4A, MP4 up to 25MB</p>
                    </div>

                    <div className="pt-2 select-none">
                      <span className="text-xs text-muted-foreground font-medium">or</span>
                    </div>

                    <label className="cursor-pointer">
                      <span className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 shadow transition-colors inline-block" style={{ backgroundColor: brandColor }}>
                        Browse Local Files
                      </span>
                      <input 
                        type="file" 
                        accept="audio/*,video/*" 
                        onChange={handleFileSelect}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="text-center">
                    <button 
                      onClick={() => setWorkspaceMode("view")}
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Return to Notes Workspace
                    </button>
                  </div>
                </>
              ) : (
                /* Loading Progress */
                <div className="space-y-8 py-8">
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-extrabold capitalize">
                      {uploadStage} note details...
                    </h3>
                    <p className="text-xs text-muted-foreground font-light">This usually takes around 15 seconds. Please do not close this window.</p>
                  </div>

                  {/* Percentage Progress slider */}
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%`, backgroundColor: brandColor }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>Analyzing voice stream</span>
                      <span>{uploadProgress}% Done</span>
                    </div>
                  </div>

                  {/* Process Stage Checklist */}
                  <div className="bg-muted/15 p-5 rounded-2xl border border-border/60 space-y-3.5">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Processing Roadmap</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 text-xs font-light">
                        {uploadProgress >= 20 ? <Check className="w-4 h-4 text-emerald-500 font-bold" /> : <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
                        <span className={uploadProgress >= 20 ? 'line-through text-muted-foreground' : 'font-bold'}>Uploading raw audio files</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-light">
                        {uploadProgress >= 40 ? <Check className="w-4 h-4 text-emerald-500 font-bold" /> : uploadProgress >= 20 ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <BlankSquare className="w-4 h-4 text-muted-foreground" />}
                        <span className={uploadProgress >= 40 ? 'line-through text-muted-foreground' : uploadProgress >= 20 ? 'font-bold' : ''}>Transcribing full speech stream</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-light">
                        {uploadProgress >= 70 ? <Check className="w-4 h-4 text-emerald-500 font-bold" /> : uploadProgress >= 40 ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <BlankSquare className="w-4 h-4 text-muted-foreground" />}
                        <span className={uploadProgress >= 70 ? 'line-through text-muted-foreground' : uploadProgress >= 40 ? 'font-bold' : ''}>Diarizing distinct speaker voices</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-light">
                        {uploadProgress >= 100 ? <Check className="w-4 h-4 text-emerald-500" /> : uploadProgress >= 70 ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <BlankSquare className="w-4 h-4 text-muted-foreground" />}
                        <span className={uploadProgress >= 100 ? 'line-through text-muted-foreground' : uploadProgress >= 70 ? 'font-bold' : ''}>Synthesizing AI summaries & action items</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- WORKSPACE: MEETING DETAIL VIEW --- */}
          {workspaceMode === "view" && (
            <>
              {selectedMeeting === null ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 max-w-sm mx-auto flex-grow">
                  <Mic className="w-12 h-12 text-primary/30 animate-bounce" />
                  <h3 className="text-xl font-bold">Your Meeting Repository</h3>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Select a meeting from history or click 'Record Live' to begin transcribing notes with instant summaries.
                  </p>
                </div>
              ) : (
                /* Active Meeting detail */
                <div className="space-y-6 flex-grow flex flex-col justify-between">
                  
                  {/* Detail Workspace Header */}
                  <div className="border-b border-border/50 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-grow min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Double click title to edit */}
                        <h2 
                          className="text-2xl font-extrabold tracking-tight hover:text-primary outline-none focus:ring-1 focus:ring-primary rounded px-1 truncate leading-none cursor-pointer"
                          title="Double-click to rename title"
                          onBlur={(e) => {
                            const val = e.currentTarget.innerText.trim()
                            if (val && val !== selectedMeeting.title) {
                              const updated = { ...selectedMeeting, title: val }
                              setSelectedMeeting(updated)
                              saveMeetingToStore(updated)
                              toast.success("Meeting renamed successfully")
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              e.currentTarget.blur()
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                        >
                          {selectedMeeting.title}
                        </h2>
                        
                        {/* Category selector */}
                        <div className="relative inline-block">
                          <select
                            value={selectedMeeting.category}
                            onChange={(e) => {
                              const cat = e.target.value as Meeting["category"]
                              const updated = { ...selectedMeeting, category: cat }
                              setSelectedMeeting(updated)
                              saveMeetingToStore(updated)
                              toast.success(`Category updated to ${cat}`)
                            }}
                            className="text-[10px] font-semibold bg-secondary text-primary border border-primary/20 rounded px-2.5 py-1 focus:outline-none cursor-pointer"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(selectedMeeting.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.floor(selectedMeeting.duration / 60)}m {(selectedMeeting.duration % 60)}s
                        </span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => deleteMeetingFromStore(selectedMeeting.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs border-red-500/30 hover:border-red-500 text-red-500 hover:bg-red-500/5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete Note
                    </Button>
                  </div>

                  {/* Tabs Row */}
                  <div className="flex border-b border-border/50 overflow-x-auto pb-1 gap-1">
                    <button 
                      onClick={() => setActiveDetailTab("summary")}
                      className={`px-4 py-2.5 text-xs font-bold shrink-0 border-b-2 transition-all ${activeDetailTab === 'summary' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Sparkles className="w-4 h-4 inline-block mr-1.5" />
                      AI Summary
                    </button>
                    <button 
                      onClick={() => setActiveDetailTab("transcript")}
                      className={`px-4 py-2.5 text-xs font-bold shrink-0 border-b-2 transition-all ${activeDetailTab === 'transcript' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Mic className="w-4 h-4 inline-block mr-1.5" />
                      Transcript Timeline
                    </button>
                    <button 
                      onClick={() => setActiveDetailTab("chat")}
                      className={`px-4 py-2.5 text-xs font-bold shrink-0 border-b-2 transition-all ${activeDetailTab === 'chat' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Send className="w-4 h-4 inline-block mr-1.5" />
                      Ask AI Chat
                    </button>
                    <button 
                      onClick={() => setActiveDetailTab("export")}
                      className={`px-4 py-2.5 text-xs font-bold shrink-0 border-b-2 transition-all ${activeDetailTab === 'export' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <ExternalLink className="w-4 h-4 inline-block mr-1.5" />
                      Export Notes
                    </button>
                  </div>

                  {/* Dynamic Tab Body */}
                  <div className="py-6 flex-grow min-h-[300px]">
                    
                    {/* --- AI SUMMARY TAB --- */}
                    {activeDetailTab === "summary" && (
                      <div className="space-y-6">
                        
                        {/* Executive TLDR */}
                        <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-2">
                          <h4 className="text-xs font-bold text-primary flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Executive Summary (TLDR)
                          </h4>
                          <p className="text-sm font-light text-foreground leading-relaxed">
                            {selectedMeeting.summary.tldr}
                          </p>
                        </div>

                        {/* Decisions list */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decisions & Core Agreements</h4>
                          {selectedMeeting.summary.decisions.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-light">No specific decisions identified by AI.</p>
                          ) : (
                            <ul className="space-y-2.5 text-sm">
                              {selectedMeeting.summary.decisions.map((dec, idx) => (
                                <li key={idx} className="flex gap-2.5 items-start">
                                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">D</div>
                                  <span className="font-light">{dec}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Action items Interactive Checklist */}
                        <div className="space-y-4 pt-4 border-t border-border/30">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interactive Action Items</h4>
                            <span className="text-[10px] text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded font-mono font-bold">
                              {selectedMeeting.action_items.filter(a => a.completed).length}/{selectedMeeting.action_items.length} Done
                            </span>
                          </div>

                          <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/50">
                            {selectedMeeting.action_items.length === 0 ? (
                              <div className="text-center py-6 text-xs text-muted-foreground font-light">
                                No tasks in this meeting. Add one below!
                              </div>
                            ) : (
                              selectedMeeting.action_items.map(item => (
                                <div 
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-card/70 group/task transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => handleToggleAction(item.id)}
                                      className="text-primary hover:scale-105 transition-transform shrink-0"
                                    >
                                      {item.completed ? (
                                        <CheckSquare className="w-5 h-5 text-primary fill-primary/10" />
                                      ) : (
                                        <BlankSquare className="w-5 h-5 text-muted-foreground/60" />
                                      )}
                                    </button>
                                    <span className={`text-sm font-light leading-snug ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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
                                      onClick={() => handleDeleteAction(item.id)}
                                      className="opacity-0 group-hover/task:opacity-100 p-1 hover:text-red-500 text-muted-foreground transition-all rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add Action Item form */}
                          <form onSubmit={handleAddActionItem} className="flex flex-col sm:flex-row gap-2 pt-2">
                            <input 
                              type="text" 
                              placeholder="Add new action item..." 
                              value={newActionText}
                              onChange={(e) => setNewActionText(e.target.value)}
                              className="flex-grow text-xs rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                            
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Assignee (e.g. Sarah)"
                                value={newActionAssignee}
                                onChange={(e) => setNewActionAssignee(e.target.value)}
                                className="text-xs bg-muted/40 rounded-xl border border-border px-3 py-2 w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <select
                                value={newActionPriority}
                                onChange={(e) => setNewActionPriority(e.target.value as any)}
                                className="text-xs bg-muted/40 rounded-xl border border-border px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                              <Button 
                                type="submit" 
                                size="sm" 
                                className="text-white rounded-xl shrink-0" 
                                style={{ backgroundColor: brandColor }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </form>
                        </div>

                      </div>
                    )}

                    {/* --- TRANSCRIPT TIMELINE TAB --- */}
                    {activeDetailTab === "transcript" && (
                      <div className="space-y-6">
                        <div className="p-3 bg-muted/10 border border-border rounded-xl text-xs flex items-center justify-between text-muted-foreground">
                          <span>💡 Click any bubble to seek playback to that timestamp</span>
                          <span className="font-semibold text-primary">Double-click speaker names to rename them globally</span>
                        </div>

                        {/* Diarized Timeline bubbles */}
                        <div className="relative pl-4 border-l border-border/80 space-y-6">
                          {selectedMeeting.transcript.map(seg => {
                            const isSegmentActive = getActivePlaybackSegmentId() === seg.id
                            const speakerName = speakersMap[seg.speakerId] || `Speaker ${seg.speakerId}`

                            return (
                              <div
                                key={seg.id}
                                onClick={() => {
                                  setPlaybackTime(seg.start)
                                  if (!isPlaying) setIsPlaying(true)
                                }}
                                className={`relative group/seg cursor-pointer rounded-xl p-3.5 transition-all border ${isSegmentActive ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-muted/15'}`}
                              >
                                {isSegmentActive && (
                                  <div 
                                    className="absolute left-[-21px] top-5 w-2 h-2 rounded-full ring-4 ring-primary/20"
                                    style={{ backgroundColor: brandColor }}
                                  />
                                )}

                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <User className={`w-3.5 h-3.5 ${isSegmentActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    
                                    {/* Inline rename speaker */}
                                    {editingSpeakerId === seg.speakerId ? (
                                      <input 
                                        type="text" 
                                        value={editingSpeakerVal}
                                        onChange={(e) => setEditingSpeakerVal(e.target.value)}
                                        onBlur={handleRenameSpeaker}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleRenameSpeaker()
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
                                          setEditingSpeakerId(seg.speakerId)
                                          setEditingSpeakerVal(speakerName)
                                        }}
                                        title="Double-click to rename globally"
                                      >
                                        {speakerName}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground group-hover/seg:text-primary transition-colors">
                                    {Math.floor(seg.start / 60).toString().padStart(2, "0")}:
                                    {(seg.start % 60).toString().padStart(2, "0")}
                                  </span>
                                </div>

                                {/* Text bubble content - editable! */}
                                {editingSegmentId === seg.id ? (
                                  <textarea 
                                    value={editingSegmentVal}
                                    onChange={(e) => setEditingSegmentVal(e.target.value)}
                                    onBlur={handleUpdateSegmentText}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleUpdateSegmentText()
                                      }
                                    }}
                                    autoFocus
                                    className="w-full text-sm font-light bg-muted border border-primary p-2 rounded focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <p className={`text-sm leading-relaxed font-light ${isSegmentActive ? 'text-foreground font-normal' : 'text-muted-foreground hover:text-foreground'}`}>
                                    {seg.text}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingSegmentId(seg.id)
                                        setEditingSegmentVal(seg.text)
                                      }}
                                      className="opacity-0 group-hover/seg:opacity-100 ml-2 inline-flex items-center gap-0.5 p-1 text-[10px] text-primary hover:underline transition-all"
                                      title="Correct transcript typo"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      Edit
                                    </button>
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* --- ASK AI MEETING CHAT TAB --- */}
                    {activeDetailTab === "chat" && (
                      <div className="flex flex-col h-full space-y-4">
                        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                          <span>Ask the **Listen AI** Meeting Copilot specific questions about topics covered in this meeting.</span>
                        </div>

                        {/* Chat history logs */}
                        <div className="flex-grow space-y-3 min-h-[220px]">
                          {(selectedMeeting.chat_history || []).map((chat, idx) => (
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

                          {chatLoading && (
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 text-sm mr-auto rounded-tl-none w-24 flex items-center justify-center gap-1.5 text-muted-foreground">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                              <span>Thinking...</span>
                            </div>
                          )}

                          {(!selectedMeeting.chat_history || selectedMeeting.chat_history.length === 0) && (
                            <div className="text-center py-8 text-xs text-muted-foreground font-light">
                              No chat history. Type a question below to start exploring your meeting notes!
                            </div>
                          )}
                        </div>

                        {/* Chat preset helpers */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button 
                            onClick={() => {
                              setChatInput("Give me a comprehensive TLDR summary")
                            }}
                            className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                          >
                            ⏱️ Summarize notes
                          </button>
                          <button 
                            onClick={() => {
                              setChatInput("List all pending action items")
                            }}
                            className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                          >
                            📋 Check remaining tasks
                          </button>
                          <button 
                            onClick={() => {
                              setChatInput("What is the primary launch deadline?")
                            }}
                            className="text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border px-3 py-1.5 rounded-full transition-all"
                          >
                            📅 Launch deadline?
                          </button>
                        </div>

                        {/* Message input */}
                        <form onSubmit={handleChatSubmit} className="flex gap-2 border-t border-border pt-4">
                          <input 
                            type="text" 
                            placeholder={isPro ? "Ask a question about this meeting..." : "🔒 Ask AI is a Pro feature (Upgrade to unlock)"}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={!isPro}
                            className="flex-grow text-xs rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <Button 
                            type="submit" 
                            disabled={!isPro || chatLoading}
                            className="text-white rounded-xl shrink-0" 
                            style={{ backgroundColor: brandColor }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    )}

                    {/* --- EXPORT TAB --- */}
                    {activeDetailTab === "export" && (
                      <div className="space-y-6">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Export your meeting details</h4>
                        <p className="text-sm font-light text-muted-foreground">Integrate and push meeting outlines cleanly into third-party documentation tools.</p>

                        <div className="grid sm:grid-cols-2 gap-4">
                          {/* Notion */}
                          <div className="border border-border/85 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm">Sync to Notion Workspace</span>
                              </div>
                              <p className="text-xs font-light text-muted-foreground leading-relaxed">Pushes decisions and checklist actions automatically in a formatted Notion page.</p>
                            </div>
                            <Button 
                              onClick={handleNotionExport}
                              disabled={syncNotionActive}
                              className="w-full text-xs font-semibold rounded-lg text-white" 
                              style={{ backgroundColor: brandColor }}
                            >
                              {syncNotionActive ? "Syncing..." : "Sync with Notion"}
                            </Button>
                          </div>

                          {/* Google Docs */}
                          <div className="border border-border/85 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm">Google Docs Drive</span>
                              </div>
                              <p className="text-xs font-light text-muted-foreground leading-relaxed">Write full detailed text notes cleanly into a Google Drive document template.</p>
                            </div>
                            <Button 
                              onClick={handleDocsExport}
                              disabled={syncDocsActive}
                              className="w-full text-xs font-semibold rounded-lg text-white" 
                              style={{ backgroundColor: brandColor }}
                            >
                              {syncDocsActive ? "Syncing..." : "Export to Docs"}
                            </Button>
                          </div>

                          {/* PDF print */}
                          <div className="border border-border/85 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm">Print PDF Document</span>
                              </div>
                              <p className="text-xs font-light text-muted-foreground leading-relaxed">Open print layout config to print or save files as structural PDFs locally.</p>
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

                          {/* Markdown clipboard copy */}
                          <div className="border border-border/85 bg-muted/5 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/10 transition-all flex flex-col justify-between h-40">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm">Copy clean GFM Markdown</span>
                              </div>
                              <p className="text-xs font-light text-muted-foreground leading-relaxed">Copy all outlines in rich GitHub Flavored Markdown formats to paste anywhere.</p>
                            </div>
                            <Button 
                              onClick={() => {
                                navigator.clipboard.writeText(`
# ${selectedMeeting.title}
Date: ${new Date(selectedMeeting.date).toLocaleDateString()}

## Executive Summary
${selectedMeeting.summary.tldr}

## Decisions
${selectedMeeting.summary.decisions.map(d => `- ${d}`).join("\n")}

## Action Checklist
${selectedMeeting.action_items.map(a => `- [${a.completed ? 'x' : ' '}] ${a.text} (Assignee: ${a.assignee}, Priority: ${a.priority})`).join("\n")}
                                `.trim())
                                toast.success("Markdown copied to clipboard!")
                              }}
                              variant="outline"
                              className="w-full text-xs font-semibold rounded-lg border-border"
                            >
                              Copy GFM Markdown
                            </Button>
                          </div>

                        </div>
                      </div>
                    )}

                  </div>

                  {/* Playback Control Bar at Bottom */}
                  <div className="border-t border-border/50 bg-muted/30 px-6 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-3.5 rounded-full hover:scale-105 active:scale-95 transition-all text-white shrink-0"
                        style={{ backgroundColor: brandColor }}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>
                      
                      <div className="min-w-0 flex-grow sm:w-48">
                        <div className="text-xs font-bold truncate leading-none mb-1">
                          Playing: {selectedMeeting.title}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-light">
                          Active voice speaker segment diarization sync
                        </span>
                      </div>
                    </div>

                    {/* Progress seeking slider */}
                    <div className="flex items-center gap-3 w-full sm:flex-grow max-w-xl">
                      <span className="text-[10px] font-mono select-none shrink-0 tabular-nums">
                        {Math.floor(playbackTime / 60).toString().padStart(2, "0")}:
                        {(playbackTime % 60).toString().padStart(2, "0")}
                      </span>
                      <input 
                        type="range"
                        min={0}
                        max={selectedMeeting.duration}
                        value={playbackTime}
                        onChange={(e) => {
                          setPlaybackTime(Number(e.target.value))
                        }}
                        className="flex-grow accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: brandColor }}
                      />
                      <span className="text-[10px] font-mono select-none shrink-0 tabular-nums">
                        {Math.floor(selectedMeeting.duration / 60).toString().padStart(2, "0")}:
                        {(selectedMeeting.duration % 60).toString().padStart(2, "0")}
                      </span>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => {
                          const speeds = [1, 1.25, 1.5, 2]
                          const idx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
                          setPlaybackSpeed(speeds[idx])
                        }}
                        className="px-3 py-1.5 bg-background border border-border text-xs font-mono font-bold rounded-lg hover:bg-secondary/70 transition-colors"
                      >
                        {playbackSpeed}x
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
