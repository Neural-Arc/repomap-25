
import React, { useState } from "react";
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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { apiKey, setApiKey, clearApiKey } = useApi();
  const [inputKey, setInputKey] = useState(apiKey || "");

  const handleSave = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      toast.success("API key saved successfully");
      onOpenChange(false);
    } else {
      toast.error("Please enter a valid API key");
    }
  };

  const handleClear = () => {
    setInputKey("");
    clearApiKey();
    toast.info("API key removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your OpenAI API key for repository analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="bg-input text-foreground border-border"
            />
            <p className="text-sm text-muted-foreground">
              Your API key is stored locally on your device and never sent to our servers
            </p>
          </div>
        </div>

        <DialogFooter>
          {apiKey && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            >
              Clear Key
            </Button>
          )}
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
