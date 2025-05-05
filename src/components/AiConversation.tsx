
import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import TypeWriter from "./TypeWriter";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/contexts/ApiContext";
import { Activity, Loader } from "lucide-react";
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
  const [analysisStartTime] = useState(Date.now());
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiCallsCompleted, setApiCallsCompleted] = useState(0);
  const [totalApiCalls, setTotalApiCalls] = useState(0);
  
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
      
      // Set up a progress tracker
      const progressCallback = (completed: number, total: number) => {
        setApiCallsCompleted(completed);
        setTotalApiCalls(total);
        
        // Calculate progress percentage
        const newProgress = Math.min(Math.floor((completed / total) * 100), 99);
        setProgress(newProgress);
        
        // Estimate remaining time based on average time per API call
        const elapsedTime = (Date.now() - analysisStartTime) / 1000;
        const timePerCall = completed > 0 ? elapsedTime / completed : 0;
        const remainingCalls = total - completed;
        const estimatedTimeRemaining = Math.ceil(timePerCall * remainingCalls);
        setTimeRemaining(estimatedTimeRemaining > 0 ? estimatedTimeRemaining : 1);
      };
      
      try {
        // Fetch repository data with progress tracking
        const data = await fetchRepositoryData(repoUrl, gitHubApiKey, progressCallback);
        setRepoData(data);
        
        if (data) {
          // Generate AI conversation based on the repository data
          const aiMessages = await generateAIConversation(repoUrl, data, geminiApiKey);
          setMessages(aiMessages);
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
            
            {timeRemaining !== null && isLoading ? (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Estimated time remaining: {timeRemaining} seconds
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {apiCallsCompleted} of {totalApiCalls} API calls completed
              </span>
            )}
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
