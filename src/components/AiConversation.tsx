
import React, { useState, useEffect, useRef } from "react";
import { useApi } from "@/contexts/ApiContext";
import TypeWriter from "./TypeWriter";
import { parseGitHubUrl, fetchRepositoryData, RepoData } from "@/services/githubService";
import { generateAIConversation } from "@/services/aiService";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock, Loader } from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

// Define proper types
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'messages'>('progress');
  
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
      // Transition directly to chat once data is loaded
      setTimeout(() => {
        setVisibleIndex(0);
        setActiveTab('messages');
      }, 500);
    }
  }, [analysisComplete, showMessages, messages, visibleIndex]);
  
  // Only call onComplete when results are truly ready and all messages are displayed
  useEffect(() => {
    if (resultsReady && !isLoading) {
      setTimeout(() => {
        onComplete();
      }, 800); // Small delay to ensure everything is fully loaded
    }
  }, [resultsReady, onComplete, isLoading]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleIndex]);
  
  // Step 1: Fetch repository data and update progress
  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setIsLoading(true);
      setShowMessages(false);
      setResultsReady(false);
      setAnalysisError(null);
      
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
        setAnalysisError("Invalid GitHub URL");
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
        // Show analysis starting message
        const initialMessage: Message = {
          agent: "integrationExpert" as AIAgent,
          content: `Starting analysis of ${repoInfo.owner}/${repoInfo.repo}. Connecting to GitHub API...`
        };
        setMessages([initialMessage]);
        
        // Fetch repository data with progress tracking
        const data = await fetchRepositoryData(repoUrl, gitHubApiKey, progressCallback);
        setRepoData(data);
        
        if (!data) {
          toast.error("Failed to fetch repository data. Check the URL and your API keys.");
          setAnalysisError("Repository data fetch failed");
          setIsLoading(false);
          return;
        }
        
        // Mark phase 1 as complete
        updatePhaseStatus(0, 'completed');
        updatePhaseProgress(0, 100);
        
        // Start phase 2 - code analysis
        updatePhaseStatus(1, 'in-progress');
        
        // Generate AI conversation based on the repository data
        const progressPhase2 = (progress: number) => {
          updatePhaseProgress(1, progress);
        };
        
        // Generate the AI conversation
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
            
            // Transition directly to chat once data is loaded
            setTimeout(() => {
              setShowMessages(true);
            }, 500);
          }, 800);
        }, 1000);
      } catch (error) {
        console.error("Error in AI conversation:", error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
        
        setMessages([
          {
            agent: "integrationExpert" as AIAgent,
            content: `Analysis error: ${errorMsg}`
          }
        ]);
        setIsLoading(false);
        setAnalysisError(errorMsg);
        toast.error(`Analysis error: ${errorMsg}`);
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
  
  const handleMessageComplete = () => {
    if (visibleIndex < messages.length - 1) {
      setTimeout(() => {
        setVisibleIndex(prev => prev + 1);
      }, 1000); // Delay between messages for better readability
    } else {
      setTimeout(() => {
        setProgress(100); // Set to 100% when all messages are displayed
        setIsLoading(false);
        setResultsReady(true); // Only now are results truly ready to be displayed
      }, 800); // Delay before completing the conversation
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate progress percentage for the radial progress indicator
  const getProgressPercentage = (phase: AnalysisPhase) => {
    return phase.status === 'completed' ? 100 : phase.progress;
  };

  // Get status indicator component based on phase status
  const getStatusIndicator = (status: 'pending' | 'in-progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 max-w-3xl mx-auto h-full">
      {/* Header */}
      <Card className="bg-gradient-to-br from-card/80 to-background/60 backdrop-blur-md border-border/50 shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">
              {isLoading ? "Repository Analysis" : "AI Analysis Results"}
            </h2>
            
            {isLoading && (
              <div className="mt-4 relative">
                {/* Radial progress indicator */}
                <div className="w-24 h-24 mx-auto relative mb-4">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      className="text-muted/20 stroke-current" 
                      strokeWidth="8" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent"
                    />
                    <circle 
                      className="text-primary stroke-current" 
                      strokeWidth="8" 
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
                
                {/* Timer display */}
                <div className="flex justify-center items-center gap-2 text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  {timeRemaining !== null ? (
                    <span className="text-amber-500 font-medium">
                      {formatTime(timeRemaining)} remaining
                    </span>
                  ) : (
                    <span>Calculating time...</span>
                  )}
                </div>

                {/* Repository info */}
                <div className="bg-muted/30 backdrop-blur-lg rounded-lg p-3 mb-4 border border-border/50">
                  <h3 className="text-sm font-medium mb-2">Analyzing Repository</h3>
                  <div className="text-sm text-muted-foreground truncate">
                    {repoUrl.replace('https://github.com/', '')}
                  </div>
                  
                  {totalApiCalls > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="bg-background/50">
                        {apiCallsCompleted} of {totalApiCalls} files analyzed
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Phase progress */}
            <div className="space-y-3 bg-background/40 backdrop-blur-sm rounded-lg p-4 border border-border/30">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Analysis Progress</span>
                <span className="text-xs text-muted-foreground">
                  {isLoading ? `${progress}% complete` : 'Complete'}
                </span>
              </div>
              
              <div className="space-y-2.5">
                {phases.map((phase, idx) => (
                  <div key={idx} className="group">
                    <div className="flex items-center gap-2">
                      {getStatusIndicator(phase.status)}
                      <span className={`text-xs ${phase.status === 'in-progress' ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                        {phase.name}
                      </span>
                      <div className="grow">
                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              phase.status === 'completed' 
                                ? 'bg-green-500' 
                                : phase.status === 'in-progress' 
                                  ? 'bg-gradient-to-r from-blue-500 to-primary animate-pulse' 
                                  : 'bg-muted'
                            }`}
                            style={{ width: `${getProgressPercentage(phase)}%` }}
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

      {/* Tabs for progress and messages */}
      {(isLoading || showMessages) && (
        <Card className="bg-gradient-to-br from-card/80 to-background/60 backdrop-blur-md border-border/50 shadow-lg overflow-hidden flex-grow">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'progress' | 'messages')} className="w-full h-full">
              <TabsList className="w-full bg-muted/30 p-1 border-b border-border/30">
                <TabsTrigger value="progress" disabled={!isLoading}>Analysis Progress</TabsTrigger>
                <TabsTrigger value="messages" disabled={!showMessages}>AI Conversation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="progress" className="p-6 space-y-4 h-full">
                {isLoading && !analysisError && (
                  <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                    <div className="space-y-4 max-w-md">
                      <h3 className="text-lg font-medium">
                        {phases.find(p => p.status === 'in-progress')?.name || 'Preparing analysis'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        We're analyzing the repository structure, examining the code patterns, and generating insights.
                        This process may take a few moments depending on the size and complexity of the codebase.
                      </p>
                      
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {['Scanning', 'Analyzing', 'Processing'].map((action, i) => (
                          <Badge key={i} variant="outline" className="bg-background/30 animate-pulse">
                            {action}
                          </Badge>
                        ))}
                      </div>
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
                    <div className="mt-4 p-3 bg-red-500/10 rounded-md text-red-500 text-sm border border-red-500/20">
                      {analysisError}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="messages" className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
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
                      <Avatar className={`${agent.color} h-10 w-10 text-xl ring-2 ring-background`}>
                        <AvatarFallback>{agent.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 flex-1">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <div className="rounded-lg bg-muted/40 backdrop-blur-sm p-3 border border-border/30">
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AiConversation;
