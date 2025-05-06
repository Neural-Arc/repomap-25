
import React, { useState, useEffect, useRef } from "react";
import { useApi } from "@/contexts/ApiContext";
import TypeWriter from "./TypeWriter";
import { parseGitHubUrl, fetchRepositoryData, RepoData, ProgressCallback } from "@/services/githubService";
import { generateAIConversation } from "@/services/aiService";
import { toast } from "sonner";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader, 
  ChevronRight,
  FileIcon,
  Code,
  Folder,
  GitBranch,
  Braces
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import CodeScanningVisualization from "./CodeScanningVisualization";

// Define proper types
type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface Message {
  agent: AIAgent;
  content: string;
  highlight?: string; // Optional highlighted text (e.g., file name being analyzed)
}

interface AiConversationProps {
  repoUrl: string;
  onComplete: () => void;
}

interface AnalysisPhase {
  id: string;
  name: string;
  weight: number;
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
  icon: React.ReactNode;
  detail?: string;
}

const agentConfig = {
  alphaCodeExpert: {
    name: "Code Expert",
    avatar: "👨‍💻",
    color: "bg-gradient-to-br from-blue-500 to-blue-600",
    borderColor: "border-blue-400",
  },
  mindMapSpecialist: {
    name: "Visualization Expert",
    avatar: "🧠",
    color: "bg-gradient-to-br from-purple-500 to-purple-600",
    borderColor: "border-purple-400",
  },
  integrationExpert: {
    name: "Integration Expert",
    avatar: "🔄",
    color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    borderColor: "border-indigo-400",
  },
};

// Fun facts about programming to display during analysis
const programmingFacts = [
  "The first computer bug was an actual bug - a moth trapped in a relay of the Harvard Mark II computer in 1947.",
  "JavaScript was created in just 10 days by Brendan Eich in 1995.",
  "The average programmer types about 50-70 words per minute.",
  "There are over 700 different programming languages.",
  "The term 'debugging' dates back to the 1940s when Grace Hopper actually found a moth in a computer.",
  "The first computer programmer was Ada Lovelace, who wrote an algorithm for the Analytical Engine in the 1840s.",
  "About 70% of coding is understanding the code, 20% is modifying it, and only 10% is writing new code.",
  "Python was named after Monty Python, not the snake.",
  "The most expensive bug in history was the Therac-25 radiation therapy machine bug, which cost several lives.",
  "GitHub's Octocat mascot is named 'Mona'.",
  "The first version control system, SCCS, was developed at Bell Labs in 1972.",
  "The average software developer spends around 30% of their time dealing with technical debt.",
];

const AiConversation: React.FC<AiConversationProps> = ({ repoUrl, onComplete }) => {
  const { geminiApiKey, gitHubApiKey } = useApi();
  const [visibleIndex, setVisibleIndex] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [analysisStartTime] = useState(Date.now());
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [apiCallsCompleted, setApiCallsCompleted] = useState(0);
  const [totalApiCalls, setTotalApiCalls] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<string | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [directoryCount, setDirectoryCount] = useState<number>(0);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [randomFact, setRandomFact] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showMessages, setShowMessages] = useState(true); // Start showing messages immediately
  const [resultsReady, setResultsReady] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages'>('messages');
  // Track whether we've started the AI conversation
  const aiConversationStarted = useRef(false);
  
  // Define analysis phases with initial state
  const [phases, setPhases] = useState<AnalysisPhase[]>([
    { 
      id: "structure", 
      name: "Repository structure", 
      weight: 0.3, 
      status: 'pending', 
      progress: 0,
      icon: <Folder className="h-4 w-4" />
    },
    { 
      id: "code", 
      name: "Code analysis", 
      weight: 0.3, 
      status: 'pending', 
      progress: 0,
      icon: <Code className="h-4 w-4" />
    },
    { 
      id: "visualization", 
      name: "Generating visualization", 
      weight: 0.3, 
      status: 'pending', 
      progress: 0, 
      icon: <Braces className="h-4 w-4" />
    },
    { 
      id: "finalizing", 
      name: "Finalizing analysis", 
      weight: 0.1, 
      status: 'pending', 
      progress: 0,
      icon: <GitBranch className="h-4 w-4" />
    }
  ]);
  
  // Initialize a random programming fact
  useEffect(() => {
    const factIndex = Math.floor(Math.random() * programmingFacts.length);
    setRandomFact(programmingFacts[factIndex]);
  }, []);
  
  // Update elapsed time and countdown
  useEffect(() => {
    if (isLoading) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
        setElapsedTime(elapsed);
        
        // Update the countdown if we have a timeRemaining estimate
        if (timeRemaining !== null && timeRemaining > 0) {
          setTimeRemaining(prevTime => Math.max(1, prevTime - 1));
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, analysisStartTime, timeRemaining]);
  
  // Calculate weighted progress based on all phases
  useEffect(() => {
    const weightedProgress = phases.reduce((acc, phase) => {
      return acc + (phase.progress * phase.weight);
    }, 0);
    
    setProgress(Math.min(99, Math.round(weightedProgress)));
  }, [phases]);
  
  // Only call onComplete when results are truly ready and all messages are displayed
  useEffect(() => {
    if (resultsReady && !isLoading) {
      console.log("Analysis is complete, calling onComplete");
      // Increased delay to ensure everything is fully loaded and visible
      setTimeout(() => {
        onComplete();
      }, 2000); // Increased from 800ms to 2000ms
    }
  }, [resultsReady, onComplete, isLoading]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleIndex]);
  
  // Helper function to update phase status
  const updatePhaseStatus = (phaseIndex: number, status: 'pending' | 'in-progress' | 'completed') => {
    setPhases(prevPhases => {
      const updatedPhases = [...prevPhases];
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        status
      };
      
      return updatedPhases;
    });
    
    if (status === 'in-progress') {
      setActivePhaseIndex(phaseIndex);
    }
  };
  
  // Helper function to update phase progress
  const updatePhaseProgress = (phaseIndex: number, progress: number | ((prev: number) => number)) => {
    setPhases(prevPhases => {
      const updatedPhases = [...prevPhases];
      const currentProgress = updatedPhases[phaseIndex].progress;
      
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        progress: typeof progress === 'function' ? progress(currentProgress) : progress
      };
      
      // Update phase detail based on the current file/directory
      if (phaseIndex === activePhaseIndex && currentFile && currentDirectory) {
        updatedPhases[phaseIndex].detail = `${currentDirectory}/${currentFile}`;
      }
      
      return updatedPhases;
    });
  };
  
  // Step 1: Fetch repository data and update progress
  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setIsLoading(true);
      setShowMessages(true);
      setResultsReady(false);
      setAnalysisError(null);
      aiConversationStarted.current = false;
      
      console.log("Starting repository analysis for URL:", repoUrl);
      
      // Reset phases
      setPhases(phases => phases.map(phase => ({
        ...phase,
        status: 'pending',
        progress: 0,
        detail: undefined
      })));
      
      // Parse the GitHub URL to get owner and repo
      const repoInfo = parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        // Add error message to conversation
        setMessages([
          {
            agent: "integrationExpert",
            content: "I couldn't parse the GitHub URL. Please check the format and try again."
          }
        ]);
        setVisibleIndex(0);
        setIsLoading(false);
        setAnalysisError("Invalid GitHub URL");
        console.error("Invalid GitHub URL:", repoUrl);
        return;
      }
      
      // Update phase status for repository structure
      updatePhaseStatus(0, 'in-progress');
      
      // Add initial conversation message
      const initialMessages: Message[] = [
        {
          agent: "integrationExpert",
          content: `Starting analysis of ${repoInfo.owner}/${repoInfo.repo}. Let's see what we can discover!`
        }
      ];
      
      setMessages(initialMessages);
      setVisibleIndex(0);
      
      // Slow down the initial message display
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Progress callback for repository data fetching
      const progressCallback: ProgressCallback = (completed: number, total: number, phase: number = 0, filePath?: string, fileType?: string) => {
        console.log(`Progress update: ${completed}/${total} (phase ${phase}) - ${filePath || 'no file'}`);
        setApiCallsCompleted(completed);
        setTotalApiCalls(total);
        
        if (filePath) {
          // Extract directory path
          const parts = filePath.split('/');
          const fileName = parts.pop() || '';
          const dirPath = parts.join('/');
          
          setCurrentFile(fileName);
          setCurrentFileType(fileType || null);
          setCurrentDirectory(dirPath || 'root');
          
          // Add occasional messages about files being analyzed
          // Show more frequent updates (reduced from 5 to 3)
          if (completed % 3 === 0 && completed > 0) {
            const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
            const extension = extensionMatch ? extensionMatch[1] : 'unknown';
            
            const newMessage: Message = {
              agent: getRandomAgent(),
              content: getRandomFileComment(fileName, extension, dirPath),
              highlight: fileName
            };
            
            setMessages(prev => [...prev, newMessage]);
            setVisibleIndex(prev => prev + 1);
          }
        }
        
        // Update phase progress for appropriate phase (0 = structure, 1 = code analysis)
        const phaseIndex = phase >= 0 && phase < phases.length ? phase : 0;
        // Slow down progress to make it more visible (reduced from 100 to 80)
        const phaseProgress = Math.min(Math.floor((completed / total) * 80), 80);
        updatePhaseProgress(phaseIndex, phaseProgress);
        
        // Calculate more accurate remaining time based on progress rate
        const elapsedSecs = (Date.now() - analysisStartTime) / 1000;
        if (completed > 0) {
          const progressRate = completed / total;
          if (progressRate > 0) {
            const estimatedTotalTime = elapsedSecs / progressRate;
            const remainingSecs = Math.max(1, Math.ceil(estimatedTotalTime - elapsedSecs));
            
            // Add adjustment based on repository complexity
            const complexityFactor = total > 50 ? 1.2 : 1;
            setTimeRemaining(Math.ceil(remainingSecs * complexityFactor));
          }
        }
      };
      
      try {
        // Fetch repository data with progress tracking
        const data = await fetchRepositoryData(repoUrl, gitHubApiKey, progressCallback);
        setRepoData(data);
        
        if (!data) {
          console.error("Repository data fetch failed");
          toast.error("Failed to fetch repository data. Check the URL and your API keys.");
          setAnalysisError("Repository data fetch failed");
          setIsLoading(false);
          return;
        }
        
        // Count total files and directories
        let files = 0;
        let directories = 0;
        
        Object.keys(data.files).forEach(dir => {
          directories++;
          files += data.files[dir].filter(file => file.type === 'file').length;
        });
        
        setFileCount(files);
        setDirectoryCount(directories);
        
        console.log(`Repository structure analyzed: ${files} files across ${directories} directories`);
        
        // Add a delay before completing the first phase to ensure visibility
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mark phase 1 (structure) as complete
        updatePhaseStatus(0, 'completed');
        updatePhaseProgress(0, 100);
        
        // Add initial findings message
        const findingsMessage: Message = {
          agent: "alphaCodeExpert",
          content: `I've found ${files} files across ${directories} directories. The primary language appears to be ${data.repo.language || 'not specified'}. Let me analyze the code structure...`
        };
        
        setMessages(prev => [...prev, findingsMessage]);
        setVisibleIndex(prev => prev + 1);
        
        // Add a delay before starting the next phase
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start phase 2 - code analysis
        updatePhaseStatus(1, 'in-progress');
        setActivePhaseIndex(1);
        
        // Generate AI conversation based on the repository data
        console.log("Starting AI conversation generation");
        const aiMessages = await generateAIConversation(
          repoUrl, 
          data, 
          geminiApiKey, 
          // Progress callback for AI generation
          (completed, total, phase = 1) => {
            console.log(`AI generation progress: ${completed}/${total} (phase ${phase})`);
            // Slow down progress to make it more visible
            const aiProgress = Math.min(Math.floor((completed / total) * 80), 80);
            updatePhaseProgress(phase, aiProgress);
          }
        );
        
        // Mark AI conversation as started to prevent duplication
        aiConversationStarted.current = true;
        
        // Add a delay before completing the code analysis phase
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark phase 2 (code analysis) as complete
        updatePhaseStatus(1, 'completed');
        updatePhaseProgress(1, 100);
        
        // Add a delay before starting the visualization phase
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start phase 3 - visualization
        updatePhaseStatus(2, 'in-progress');
        setActivePhaseIndex(2);
        
        // Add visualization message from mindMapSpecialist
        const visualizationMessage: Message = {
          agent: "mindMapSpecialist",
          content: `I'm creating a visual representation of the repository structure. This will help you understand the organization and relationships between different components.`
        };
        
        setMessages(prev => [...prev, visualizationMessage]);
        setVisibleIndex(prev => prev + 1);
        
        // Add a delay to allow the visualization message to be read
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Simulate visualization generation with progress updates (slowed down)
        let visualProgress = 0;
        const visualizationInterval = setInterval(() => {
          visualProgress += 5; // Reduced from 10 to 5 for slower progress
          updatePhaseProgress(2, Math.min(visualProgress, 100));
          
          if (visualProgress >= 100) {
            clearInterval(visualizationInterval);
            
            // Add a delay before completing the visualization phase
            setTimeout(async () => {
              // Mark visualization phase as complete
              updatePhaseStatus(2, 'completed');
              
              // Add a delay before starting the final phase
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Start final phase
              updatePhaseStatus(3, 'in-progress');
              setActivePhaseIndex(3);
              
              // Add a message about finalizing the analysis
              const finalizingMessage: Message = {
                agent: "integrationExpert",
                content: `Now finalizing the analysis and preparing insights about this repository...`
              };
              
              setMessages(prev => [...prev, finalizingMessage]);
              setVisibleIndex(prev => prev + 1);
              
              // Add a delay before showing AI conversation messages
              await new Promise(resolve => setTimeout(resolve, 2500));
              
              // Add the AI conversation messages - skip the first 2 as we're adding custom ones
              // Start with the 3rd message from aiMessages 
              const remainingMessages = aiMessages.slice(2);
              
              // Function to add messages one by one with animation
              const addMessagesSequentially = async (index = 0) => {
                if (index < remainingMessages.length) {
                  setMessages(prev => [...prev, remainingMessages[index]]);
                  setVisibleIndex(prev => prev + 1);
                  
                  // Update progress for finalizing phase
                  const finalProgress = Math.min(
                    Math.floor((index / remainingMessages.length) * 100), 
                    100
                  );
                  updatePhaseProgress(3, finalProgress);
                  
                  // Schedule next message with a longer delay for better readability
                  const messageDelay = 2500; // Increased from 1500ms to 2500ms
                  await new Promise(resolve => setTimeout(resolve, messageDelay));
                  addMessagesSequentially(index + 1);
                } else {
                  // All messages added, wait before completing the final phase
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Complete the final phase
                  updatePhaseProgress(3, 100);
                  updatePhaseStatus(3, 'completed');
                  
                  // Mark analysis as complete
                  setAnalysisComplete(true);
                  setIsLoading(false);
                  setResultsReady(true);
                  console.log("Analysis complete, results ready");
                }
              };
              
              // Start adding messages
              addMessagesSequentially();
            }, 1000);
          }
        }, 500); // Increased from 300ms to 500ms
      } catch (error) {
        console.error("Error in AI conversation:", error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
        
        setMessages([
          {
            agent: "integrationExpert",
            content: `Analysis error: ${errorMsg}`
          }
        ]);
        setVisibleIndex(0);
        setIsLoading(false);
        setAnalysisError(errorMsg);
        toast.error(`Analysis error: ${errorMsg}`);
      }
    };
    
    fetchData();
  }, [repoUrl, gitHubApiKey, geminiApiKey, onComplete]);
  
  // Helper function to get a random agent for messages
  const getRandomAgent = (): AIAgent => {
    const agents: AIAgent[] = ["alphaCodeExpert", "mindMapSpecialist", "integrationExpert"];
    return agents[Math.floor(Math.random() * agents.length)];
  };
  
  // Helper function to generate random comments about files
  const getRandomFileComment = (fileName: string, extension: string, dirPath: string): string => {
    const fileComments = [
      `Looking at ${fileName} in the ${dirPath || 'root'} directory. Nice ${extension} code here!`,
      `Analyzing ${fileName}... This ${extension} file has some interesting patterns.`,
      `Found ${fileName} - this looks like a key component in the ${dirPath || 'root'} structure.`,
      `Examining ${fileName}... I see some well-structured ${extension} code.`,
      `${fileName} appears to be ${Math.random() > 0.5 ? 'well documented' : 'could use more comments'}.`,
      `This ${extension} file (${fileName}) is contributing to the overall architecture.`,
      `${fileName} seems to be handling ${dirPath.includes('util') ? 'utility functions' : dirPath.includes('component') ? 'UI components' : 'core functionality'}.`,
      `Interesting implementation in ${fileName}. The ${extension} code is ${Math.random() > 0.5 ? 'clean and maintainable' : 'somewhat complex but effective'}.`
    ];
    
    return fileComments[Math.floor(Math.random() * fileComments.length)];
  };
  
  const handleMessageComplete = () => {
    if (visibleIndex < messages.length - 1) {
      // Increase delay between messages for better readability
      setTimeout(() => {
        setVisibleIndex(prev => prev + 1);
      }, 1500); // Increased from 1000ms to 1500ms
    } else {
      // Increase delay before completing the conversation
      setTimeout(() => {
        setProgress(100); // Set to 100% when all messages are displayed
        setIsLoading(false);
        setResultsReady(true); // Only now are results truly ready to be displayed
        console.log("All messages displayed, results ready");
      }, 1500); // Increased from 800ms to 1500ms
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Get status indicator component based on phase status
  const getStatusIndicator = (status: 'pending' | 'in-progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Loader className="h-4 w-4 text-indigo-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Progress Card */}
        <Card className="bg-gradient-to-br from-card/80 to-background/60 backdrop-blur-md border-border/50 shadow-lg overflow-hidden col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                  Repository Analysis
                </h2>
                <Badge variant="outline" className="bg-background/20 backdrop-blur-sm">
                  {progress}% complete
                </Badge>
              </div>
              
              {/* Progress radial */}
              <div className="flex justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      className="text-muted/20 stroke-current" 
                      strokeWidth="10" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent"
                    />
                    <circle 
                      className="text-indigo-500 stroke-current" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                      transform="rotate(-90 50 50)"
                    />
                    <text 
                      x="50" 
                      y="50" 
                      className="text-xl font-bold" 
                      dominantBaseline="middle" 
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {progress}%
                    </text>
                  </svg>
                </div>
              </div>
              
              {/* Timer display */}
              <div className="flex justify-center items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {timeRemaining !== null ? (
                  <span className="text-amber-500 font-medium">
                    {formatTime(timeRemaining)} remaining
                  </span>
                ) : (
                  <span>Calculating time...</span>
                )}
              </div>
              
              {/* Repository stats */}
              {repoData && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-background/20 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Files</span>
                    <span className="font-medium text-lg">{fileCount}</span>
                  </div>
                  <div className="bg-background/20 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Directories</span>
                    <span className="font-medium text-lg">{directoryCount}</span>
                  </div>
                </div>
              )}
              
              {/* Code visualization component */}
              <CodeScanningVisualization 
                active={isLoading && activePhaseIndex >= 1} 
                phase={activePhaseIndex === 1 ? "Code Analysis" : activePhaseIndex === 2 ? "Visualization" : "Finalizing"}
              />
              
              {/* Current file being analyzed */}
              {currentFile && currentFileType && isLoading && (
                <div className="bg-background/20 backdrop-blur-sm rounded-lg p-2">
                  <div className="text-xs text-muted-foreground mb-1">Currently analyzing:</div>
                  <div className="flex items-center gap-2">
                    {currentFileType === 'directory' ? (
                      <Folder className="h-4 w-4 text-purple-400" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-blue-400" />
                    )}
                    <span className="text-sm truncate font-mono">
                      {currentDirectory && currentDirectory !== 'root' ? `${currentDirectory}/` : ''}
                      {currentFile}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Random programming fact */}
              <div className="bg-background/20 backdrop-blur-sm rounded-lg p-3 text-xs text-muted-foreground italic border-l-2 border-indigo-500/50">
                <span className="font-medium text-primary text-sm">Did you know?</span> {randomFact}
              </div>
              
              {/* Phases progress */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Analysis Phases</div>
                
                <div className="space-y-2.5">
                  {phases.map((phase, idx) => (
                    <div key={phase.id} className="group">
                      <div className="flex items-center gap-2">
                        {getStatusIndicator(phase.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs ${phase.status === 'in-progress' ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                              {phase.name}
                            </span>
                            {phase.icon}
                          </div>
                          
                          {phase.status === 'in-progress' && phase.detail && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-full">
                              {phase.detail}
                            </div>
                          )}
                          
                          <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                phase.status === 'completed' 
                                  ? 'bg-green-500' 
                                  : phase.status === 'in-progress' 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' 
                                    : 'bg-muted'
                              }`}
                              style={{ width: `${phase.progress}%` }}
                            />
                          </div>
                        </div>
                        <Badge 
                          variant={phase.status === 'completed' ? 'outline' : 'secondary'} 
                          className="ml-auto text-xs bg-background/50 border-border/50"
                        >
                          {phase.progress}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Conversation Card */}
        <Card className="bg-gradient-to-br from-card/80 to-background/60 backdrop-blur-md border-border/50 shadow-lg overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'messages')} className="w-full">
              <TabsList className="w-full rounded-none bg-muted/30 p-0 h-12">
                <TabsTrigger 
                  value="messages" 
                  className="rounded-none flex-1 h-12 data-[state=active]:bg-background/40"
                >
                  AI Analysis Conversation
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="messages" className="mt-0">
                <ScrollArea className="h-[600px] px-6 py-4">
                  {showMessages && messages.map((message, index) => {
                    const agent = agentConfig[message.agent];
                    const isVisible = index <= visibleIndex;
                    
                    if (!isVisible) return null;

                    return (
                      <div
                        key={index}
                        className={`flex items-start space-x-4 mb-6 animate-fade-in ${
                          index === visibleIndex ? "opacity-100" : "opacity-90"
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <Avatar className={`${agent.color} h-10 w-10 text-xl ring-2 ring-background ${agent.borderColor}`}>
                          <AvatarFallback>{agent.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1 flex-1">
                          <span className="text-sm font-medium">{agent.name}</span>
                          <div className="rounded-lg bg-muted/40 backdrop-blur-sm p-3 border border-border/30 shadow-sm">
                            {index === visibleIndex ? (
                              <TypeWriter
                                text={message.content}
                                speed={30} // Slightly faster typing for better engagement
                                onComplete={handleMessageComplete}
                                className="text-sm"
                                highlight={message.highlight}
                              />
                            ) : (
                              <span className="text-sm">
                                {message.highlight ? (
                                  <>
                                    {message.content.split(message.highlight).map((part, i, arr) => (
                                      <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                          <span className="bg-indigo-500/20 px-1 rounded text-indigo-200 font-mono">
                                            {message.highlight}
                                          </span>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </>
                                ) : (
                                  message.content
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Initializing analysis...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error state */}
                  {analysisError && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Analysis Failed</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        We encountered an error while analyzing the repository.
                        Please check the URL and try again.
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.location.reload()}
                          className="gap-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiConversation;
