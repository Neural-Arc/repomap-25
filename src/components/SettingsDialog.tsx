
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/contexts/ApiContext";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeyChange?: () => void; // Optional callback when API keys change
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  onApiKeyChange,
}) => {
  const { 
    geminiApiKey, 
    gitHubApiKey, 
    setGeminiApiKey, 
    setGitHubApiKey,
    clearGeminiApiKey, 
    clearGitHubApiKey 
  } = useApi();
  
  const [inputGeminiKey, setInputGeminiKey] = useState(geminiApiKey || "");
  const [inputGitHubKey, setInputGitHubKey] = useState(gitHubApiKey || "");

  // Update input fields when API keys change
  useEffect(() => {
    if (open) {
      setInputGeminiKey(geminiApiKey || "");
      setInputGitHubKey(gitHubApiKey || "");
    }
  }, [open, geminiApiKey, gitHubApiKey]);

  const handleSave = () => {
    let hasValidKeys = false;
    let keysChanged = false;
    
    // Check if Gemini key has changed
    if (inputGeminiKey.trim() !== (geminiApiKey || "")) {
      keysChanged = true;
      if (inputGeminiKey.trim()) {
        setGeminiApiKey(inputGeminiKey.trim());
        hasValidKeys = true;
      } else if (geminiApiKey) {
        // If field was cleared but had a previous value
        clearGeminiApiKey();
      }
    } else if (geminiApiKey) {
      hasValidKeys = true;
    }
    
    // Check if GitHub key has changed
    if (inputGitHubKey.trim() !== (gitHubApiKey || "")) {
      keysChanged = true;
      if (inputGitHubKey.trim()) {
        setGitHubApiKey(inputGitHubKey.trim());
        hasValidKeys = true;
      } else if (gitHubApiKey) {
        // If field was cleared but had a previous value
        clearGitHubApiKey();
      }
    } else if (gitHubApiKey) {
      hasValidKeys = true;
    }
    
    if (hasValidKeys) {
      toast.success("API keys saved successfully");
      onOpenChange(false);
      
      // Notify parent component if keys have changed
      if (keysChanged && onApiKeyChange) {
        onApiKeyChange();
      }
    } else {
      toast.error("Please enter at least one API key");
    }
  };

  const handleClearGemini = () => {
    setInputGeminiKey("");
    clearGeminiApiKey();
    toast.info("Gemini API key removed");
    if (onApiKeyChange) onApiKeyChange();
  };
  
  const handleClearGitHub = () => {
    setInputGitHubKey("");
    clearGitHubApiKey();
    toast.info("GitHub API key removed");
    if (onApiKeyChange) onApiKeyChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your API keys for repository analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey">Gemini API Key</Label>
            <Input
              id="geminiApiKey"
              type="password"
              placeholder="Enter your Gemini API key..."
              value={inputGeminiKey}
              onChange={(e) => setInputGeminiKey(e.target.value)}
              className="bg-input text-foreground border-border"
            />
            <p className="text-sm text-muted-foreground">
              Required for AI-powered repository analysis
            </p>
            
            {geminiApiKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearGemini}
                className="mt-1 bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear Gemini Key
              </Button>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="gitHubApiKey">GitHub API Key</Label>
            <Input
              id="gitHubApiKey"
              type="password"
              placeholder="ghp_..."
              value={inputGitHubKey}
              onChange={(e) => setInputGitHubKey(e.target.value)}
              className="bg-input text-foreground border-border"
            />
            <p className="text-sm text-muted-foreground">
              Used to access repository data with higher rate limits
            </p>
            
            {gitHubApiKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearGitHub}
                className="mt-1 bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear GitHub Key
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Your API keys are stored locally on your device and never sent to our servers
          </p>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSave} 
            className="bg-primary text-primary-foreground"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
