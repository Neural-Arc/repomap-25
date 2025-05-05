
import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import TypeWriter from "./TypeWriter";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/contexts/ApiContext";
import { CheckCircle, Circle, AlertCircle, Clock, Loader } from "lucide-react";
import { parseGitHubUrl, fetchRepositoryData, RepoData } from "@/services/githubService";
import { generateAIConversation } from "@/services/aiService";
import CodeScanningVisualization from "./CodeScanningVisualization";
import { Badge } from "@/components/ui/badge";

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
  const [phases, setPhases] = useState<AnalysisPhase[]>([
    { name: "Repository structure", weight: 0.3, status: 'pending', progress: 0 },
    { name: "Code analysis", weight: 0.3, status: 'pending', progress: 0 },
    { name: "Generating visualization", weight: 0.3, status: 'pending', progress: 0 },
    { name: "Preparing conversation", weight: 0.1, status: 'pending', progress: 0 }
  ]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [activeCodeVisPhase, setActiveCodeVisPhase] = useState("");
  
  // Get the current active phase name
  const currentPhase = phases.find(phase => phase.status === 'in-progress')?.name || 
                       phases.find(phase => phase.status === 'pending')?.name || 
                       "Analysis complete";
  
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
  
  // Only start showing messages when analysis is complete and we're ready to display
  useEffect(() => {
    if (analysisComplete && showMessages && visibleIndex === -1 && messages.length > 0) {
      // Add a small delay before starting the conversation
      setTimeout(() => {
        setVisibleIndex(0);
      }, 1500);
    }
  }, [analysisComplete, showMessages, messages, visibleIndex]);
  
  // Only call onComplete when results are truly ready and all messages are displayed
  useEffect(() => {
    if (resultsReady && !isLoading) {
      setTimeout(() => {
        onComplete();
      }, 1000); // Small delay to ensure everything is fully loaded
    }
  }, [resultsReady, onComplete, isLoading]);
  
  // Update the active phase for the code scanning visualization
  useEffect(() => {
    const activePhase = phases.find(p => p.status === 'in-progress');
    if (activePhase) {
      setActiveCodeVisPhase(activePhase.name);
    } else {
      setActiveCodeVisPhase("");
    }
  }, [phases]);
  
  // Step 1: Fetch repository data and update progress
  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setIsLoading(true);
      setShowMessages(false);
      setResultsReady(false);
      
      // Parse the GitHub URL to get owner and repo
      const repoInfo = parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        // Add error message to conversation
        setMessages([
          {
            agent: "integrationExpert" as AIAgent,
            content: "I couldn't parse the GitHub URL. Please check the format and try again."
          }
        ]);
        setIsLoading(false);
        return;
      }
      
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
          
          // Message for starting the analysis
          const initialMessage: Message = {
            agent: "integrationExpert" as AIAgent,
            content: `Starting analysis of ${repoInfo.owner}/${repoInfo.repo}. Connecting to GitHub API...`
          };
          
          // Set the initial message temporarily while we generate the visualization
          setMessages([initialMessage]);
          
          const aiMessages = await generateAIConversation(repoUrl, data, geminiApiKey, progressPhase2);
          
          // Mark phase 2 as complete
          updatePhaseStatus(1, 'completed');
          updatePhaseProgress(1, 100);
          
          // Start phase 3 - visualization
          updatePhaseStatus(2, 'in-progress');
          
          // Simulate visualization generation (will be replaced with actual visualization in a real implementation)
          setTimeout(() => {
            updatePhaseProgress(2, 100);
            updatePhaseStatus(2, 'completed');
            
            // Start phase 4 - preparing conversation
            updatePhaseStatus(3, 'in-progress');
            
            // Replace the initial "Starting analysis" message with the real conversation
            setMessages(aiMessages);
            
            // Wait a bit before finalizing phase 4
            setTimeout(() => {
              updatePhaseProgress(3, 100);
              updatePhaseStatus(3, 'completed');
              
              // Mark analysis as complete but don't show messages yet
              setAnalysisComplete(true);
              
              // Wait a little bit before showing the messages to ensure smooth transition
              setTimeout(() => {
                setShowMessages(true);
              }, 1000);
            }, 1500);
          }, 2000);
        } else {
          // Set error message if data fetch failed
          setMessages([
            {
              agent: "integrationExpert" as AIAgent,
              content: "There was an error fetching repository data. Please check the repository URL and your API keys."
            }
          ]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in AI conversation:", error);
        setMessages([
          {
            agent: "integrationExpert" as AIAgent,
            content: `Analysis error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }
        ]);
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
      }, 1500); // Increased delay between messages for better readability
    } else {
      setTimeout(() => {
        setProgress(100); // Set to 100% when all messages are displayed
        setIsLoading(false);
        setResultsReady(true); // Only now are results truly ready to be displayed
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
            
            {isLoading && timeRemaining !== null ? (
              <div className="flex items-center gap-1 text-amber-500 font-medium">
                <Clock className="h-3 w-3" />
                <span>Time remaining: {formatTime(timeRemaining)}</span>
              </div>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isLoading ? "Calculating..." : `Completed in ${formatTime(elapsedTime)}`}
              </span>
            )}
          </div>
          
          {/* Prominent countdown timer when we have an estimate */}
          {isLoading && timeRemaining !== null && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center justify-center mt-2">
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-amber-500">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Estimated time remaining
                </div>
              </div>
            </div>
          )}
          
          {/* Phase progress indicators with improved visibility */}
          <div className="space-y-2 mt-3 text-left border border-border rounded-lg p-3">
            <h4 className="text-xs font-medium mb-2">Analysis Progress</h4>
            {phases.map((phase, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {phase.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : phase.status === 'in-progress' ? (
                  <Circle className="h-4 w-4 text-blue-500 animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-xs ${phase.status === 'in-progress' ? 'font-medium' : ''}`}>
                  {phase.name}
                </span>
                <Badge 
                  variant={phase.status === 'completed' ? 'outline' : 'secondary'} 
                  className="ml-auto text-xs"
                >
                  {phase.progress}%
                </Badge>
              </div>
            ))}
          </div>
          
          {/* Code scanning visualization */}
          {isLoading && phases.some(p => p.status === 'in-progress') && (
            <div className="mt-4">
              <CodeScanningVisualization 
                active={phases.some(p => p.status === 'in-progress')}
                phase={activeCodeVisPhase}
              />
            </div>
          )}
        </div>
      </div>

      {/* Only show messages after analysis is complete and visibleIndex >= 0 */}
      {showMessages && visibleIndex >= 0 && messages.slice(0, visibleIndex + 1).map((message, index) => {
        const agent = agentConfig[message.agent];

        return (
          <div
            key={index}
            className={`flex items-start space-x-4 animate-fade-in ${
              index === visibleIndex ? "opacity-100" : "opacity-90"
            }`}
            style={{ animationDelay: `${index * 0.2}s` }}
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
                    speed={40} // Slower typing speed for better readability
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
      
      {/* Show loading state when no messages are visible yet */}
      {(!showMessages || visibleIndex < 0) && isLoading && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative">
            <Loader className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          </div>
          
          <span className="text-lg font-medium mb-2 mt-4">{currentPhase}</span>
          <p className="text-sm text-muted-foreground max-w-md">
            We're examining the codebase, analyzing patterns, and generating insights.
            This may take a moment depending on the repository size.
          </p>
          
          {/* API call progress information */}
          {totalApiCalls > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              <span>{apiCallsCompleted} of {totalApiCalls} API calls completed</span>
            </div>
          )}
        </div>
      )}
      
      {/* Show transition message when analysis is complete but conversation hasn't started */}
      {analysisComplete && !isLoading && !showMessages && (
        <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <span className="text-lg font-medium mb-2">Analysis Complete!</span>
          <p className="text-sm text-muted-foreground max-w-md">
            Our AI experts are preparing their insights about this repository.
            The conversation will begin momentarily...
          </p>
        </div>
      )}
      
      {/* Show error state when analysis fails */}
      {!isLoading && messages.length === 1 && messages[0].content.includes("error") && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <span className="text-lg font-medium mb-2">Analysis Failed</span>
          <p className="text-sm text-muted-foreground max-w-md">
            We encountered an error while analyzing the repository.
            Please check the URL and try again.
          </p>
        </div>
      )}
    </div>
  );
};

export default AiConversation;
