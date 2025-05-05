
import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import TypeWriter from "./TypeWriter";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/contexts/ApiContext";
import { Activity, Loader, Clock } from "lucide-react";
import { parseGitHubUrl, fetchRepositoryData, RepoData } from "@/services/githubService";
import { generateAIConversation } from "@/services/aiService";

type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface Message {
  agent: AIAgent;
  content: string;
}

interface AiConversationProps {
  repoUrl: string;
  onComplete: () => void;
}

interface AnalysisPhase {
  name: string;
  weight: number;
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
}

const agentConfig = {
  alphaCodeExpert: {
    name: "Alpha Code Expert",
    avatar: "👨‍💻",
    color: "bg-blue-500",
  },
  mindMapSpecialist: {
    name: "Mind Map Specialist",
    avatar: "🧠",
    color: "bg-green-500",
  },
  integrationExpert: {
    name: "Integration Expert",
    avatar: "🔄",
    color: "bg-purple-500",
  },
};

const AiConversation: React.FC<AiConversationProps> = ({ repoUrl, onComplete }) => {
  const { geminiApiKey, gitHubApiKey } = useApi();
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [analysisStartTime] = useState(Date.now());
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiCallsCompleted, setApiCallsCompleted] = useState(0);
  const [totalApiCalls, setTotalApiCalls] = useState(0);
  const [phases, setPhases] = useState<AnalysisPhase[]>([
    { name: "Repository structure", weight: 0.4, status: 'pending', progress: 0 },
    { name: "Code analysis", weight: 0.3, status: 'pending', progress: 0 },
    { name: "Generating visualization", weight: 0.3, status: 'pending', progress: 0 }
  ]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update elapsed time
  useEffect(() => {
    if (isLoading) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, analysisStartTime]);
  
  // Calculate weighted progress based on all phases
  useEffect(() => {
    const weightedProgress = phases.reduce((acc, phase) => {
      return acc + (phase.progress * phase.weight);
    }, 0);
    
    setProgress(Math.min(99, Math.round(weightedProgress)));
  }, [phases]);
  
  // Step 1: Fetch repository data and update progress
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
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
        setIsLoading(false);
        return;
      }
      
      // Start with initial messages
      setMessages([
        {
          agent: "integrationExpert",
          content: `Starting analysis of ${repoInfo.owner}/${repoInfo.repo}. Connecting to GitHub API...`
        }
      ]);
      
      // Update phase status
      updatePhaseStatus(0, 'in-progress');
      
      // Set up a progress tracker with enhanced details
      const progressCallback = (completed: number, total: number, phase: number = 0) => {
        setApiCallsCompleted(completed);
        setTotalApiCalls(total);
        
        // Update appropriate phase progress
        const phaseProgress = Math.min(Math.floor((completed / total) * 100), 100);
        updatePhaseProgress(phase, phaseProgress);
        
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
        
        // Mark phase 1 as complete
        updatePhaseStatus(0, 'completed');
        updatePhaseProgress(0, 100);
        
        // Start phase 2 - code analysis
        updatePhaseStatus(1, 'in-progress');
        
        if (data) {
          // Generate AI conversation based on the repository data
          const progressPhase2 = (progress: number) => {
            updatePhaseProgress(1, progress);
          };
          
          const aiMessages = await generateAIConversation(repoUrl, data, geminiApiKey, progressPhase2);
          setMessages(aiMessages);
          
          // Mark phase 2 as complete
          updatePhaseStatus(1, 'completed');
          updatePhaseProgress(1, 100);
          
          // Start phase 3 - visualization
          updatePhaseStatus(2, 'in-progress');
          setTimeout(() => {
            updatePhaseProgress(2, 100);
            updatePhaseStatus(2, 'completed');
          }, 1500);
        } else {
          // Set error message if data fetch failed
          setMessages([
            {
              agent: "integrationExpert",
              content: "There was an error fetching repository data. Please check the repository URL and your API keys."
            }
          ]);
        }
      } catch (error) {
        console.error("Error in AI conversation:", error);
        setMessages([
          {
            agent: "integrationExpert",
            content: `Analysis error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [repoUrl, gitHubApiKey, geminiApiKey]);
  
  // Helper function to update phase status
  const updatePhaseStatus = (phaseIndex: number, status: 'pending' | 'in-progress' | 'completed') => {
    setPhases(prevPhases => 
      prevPhases.map((phase, idx) => 
        idx === phaseIndex ? { ...phase, status } : phase
      )
    );
  };
  
  // Helper function to update phase progress
  const updatePhaseProgress = (phaseIndex: number, progress: number) => {
    setPhases(prevPhases => 
      prevPhases.map((phase, idx) => 
        idx === phaseIndex ? { ...phase, progress } : phase
      )
    );
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleIndex]);
  
  const handleMessageComplete = () => {
    if (visibleIndex < messages.length - 1) {
      setTimeout(() => {
        setVisibleIndex(prev => prev + 1);
      }, 800); // Delay between messages
    } else {
      setProgress(100); // Set to 100% when all messages are displayed
      setTimeout(() => {
        onComplete();
      }, 1500); // Delay before completing the conversation
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col space-y-4 p-4 max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="text-center mb-8">
        <h2 className="text-lg font-medium text-muted-foreground">
          {isLoading ? "Repository Analysis in Progress" : "AI Analysis Results"}
        </h2>
        
        <div className="mt-4 space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {isLoading && <Loader className="h-3 w-3 animate-spin" />}
              {progress}% complete
            </span>
            
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeRemaining !== null ? (
                  <span>Estimated time remaining: {formatTime(timeRemaining)}</span>
                ) : (
                  <span>Calculating remaining time...</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Completed in {formatTime(elapsedTime)}
              </span>
            )}
          </div>
          
          {/* Phase progress indicators */}
          <div className="space-y-2 mt-2 text-left">
            {phases.map((phase, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  phase.status === 'completed' ? 'bg-green-500' : 
                  phase.status === 'in-progress' ? 'bg-blue-500 animate-pulse' : 'bg-muted'
                }`} />
                <span className="text-xs">{phase.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{phase.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {messages.slice(0, visibleIndex + 1).map((message, index) => {
        const agent = agentConfig[message.agent];

        return (
          <div
            key={index}
            className={`flex items-start space-x-4 animate-fade-in ${
              index === visibleIndex ? "opacity-100" : "opacity-90"
            }`}
          >
            <Avatar className={`${agent.color} text-xl`}>
              <span>{agent.avatar}</span>
            </Avatar>
            <div className="flex flex-col space-y-1 flex-1">
              <span className="text-sm font-medium">{agent.name}</span>
              <div className="rounded-lg bg-muted p-3">
                {index === visibleIndex ? (
                  <TypeWriter
                    text={message.content}
                    speed={20}
                    onComplete={handleMessageComplete}
                    className="text-sm"
                  />
                ) : (
                  <span className="text-sm">{message.content}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
      
      {messages.length === 0 && isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Analyzing repository structure...</span>
        </div>
      )}
    </div>
  );
};

export default AiConversation;
