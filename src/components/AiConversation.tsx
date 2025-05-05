
import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import TypeWriter from "./TypeWriter";
import { Progress } from "@/components/ui/progress";

type AIAgent = "codeExpert" | "mindMapSpecialist" | "integrationAgent";

interface Message {
  agent: AIAgent;
  content: string;
}

interface AiConversationProps {
  repoUrl: string;
  onComplete: () => void;
}

const agentConfig = {
  codeExpert: {
    name: "Code Expert",
    avatar: "👩‍💻",
    color: "bg-blue-500",
  },
  mindMapSpecialist: {
    name: "Mind Map Specialist",
    avatar: "🧠",
    color: "bg-green-500",
  },
  integrationAgent: {
    name: "Integration Agent",
    avatar: "🔄",
    color: "bg-purple-500",
  },
};

const generateConversation = (repoUrl: string): Message[] => {
  const repoName = repoUrl.split("/").slice(-2).join("/");
  
  return [
    {
      agent: "codeExpert",
      content: `Starting analysis of ${repoName}. Let's dig into the structure and code patterns.`,
    },
    {
      agent: "mindMapSpecialist",
      content: "I'll prepare the visualization framework. What's the primary language in this repo?",
    },
    {
      agent: "codeExpert",
      content: `Based on the repo structure, it appears to be primarily JavaScript with some TypeScript components.`,
    },
    {
      agent: "integrationAgent",
      content: `Fetching repository metadata and file structure from GitHub API. This might take a moment.`,
    },
    {
      agent: "mindMapSpecialist",
      content: `Perfect! I'll set up nodes for the main directories and create relationships between core components.`,
    },
    {
      agent: "codeExpert",
      content: `I'm detecting several key patterns: modular architecture, shared utilities, and a component-based frontend structure.`,
    },
    {
      agent: "integrationAgent",
      content: `Analysis complete! I've mapped 78 files across 12 directories with 230+ function relationships.`,
    },
    {
      agent: "mindMapSpecialist",
      content: `Mind map construction finished. Rendering visualization with collapsible nodes and relationship indicators.`,
    },
    {
      agent: "codeExpert",
      content: `Final touches complete. You can now explore the repository structure and see how components interact.`,
    },
  ];
};

const AiConversation: React.FC<AiConversationProps> = ({ repoUrl, onComplete }) => {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [analysisStartTime] = useState(Date.now());
  const estimatedTimeSeconds = 30; // Estimate 30 seconds for full analysis
  
  useEffect(() => {
    // Generate conversation based on repo URL
    setMessages(generateConversation(repoUrl));
  }, [repoUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleIndex]);
  
  useEffect(() => {
    // Update progress and time remaining
    const interval = setInterval(() => {
      const elapsedTime = (Date.now() - analysisStartTime) / 1000;
      const newProgress = Math.min(Math.floor((elapsedTime / estimatedTimeSeconds) * 100), 99);
      
      // Don't reach 100% until actually complete
      if (visibleIndex < messages.length - 1) {
        setProgress(newProgress);
        
        // Calculate time remaining
        const remainingTime = Math.max(Math.ceil(estimatedTimeSeconds - elapsedTime), 1);
        setTimeRemaining(remainingTime);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [analysisStartTime, messages.length, visibleIndex]);
  
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
          AI Analysis in Progress
        </h2>
        
        <div className="mt-4 space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>Estimated time remaining: {timeRemaining} seconds</span>
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
    </div>
  );
};

export default AiConversation;
