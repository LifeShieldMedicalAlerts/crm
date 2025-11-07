import { useAuth } from "@/contextproviders/AuthContext";
import { useContactCenter } from '../contextproviders/ContactCenterContext';
import { TopBar } from "@/components/top-bar"
import CallScript from "@/components/call-script";
import { Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function Dashboard() {
  const { user, dbUser, initError } = useAuth();
  const {
    sipState,
    sipError,
    currentCall,
    shouldDisposition,
    handleDisposition,
    campaignSettings
  } = useContactCenter();

  const [selectedDisposition, setSelectedDisposition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log("sipState ", sipState)
  }, [sipState])

  // Reset disposition selection when dialog opens
  useEffect(() => {
    if (shouldDisposition) {
      setSelectedDisposition("");
    }
  }, [shouldDisposition]);

  const handleSubmitDisposition = useCallback(async () => {
    if (!selectedDisposition) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get call UUID from currentCall or wherever it's stored
      await handleDisposition(selectedDisposition);
      setSelectedDisposition("");
    } catch (error) {
      console.error('Error submitting disposition:', error);
    } finally {
      setIsSubmitting(false);
    }
  },[selectedDisposition]);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <TriangleAlert className="h-10 w-10 text-red-600" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Configuration Error</h2>
            <p className="text-sm text-muted-foreground">
              {initError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while agent is not logged in or connection is being established
  if (sipState !== 'registered') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Configuring...</h2>
            <p className="text-sm text-muted-foreground">
              Setting up your workspace
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's a connection error
  if (sipError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <TriangleAlert className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Connection Error</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sipError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        {currentCall ? (
          <CallScript />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No active call</p>
          </div>
        )}
      </div>
    </div>

      <Dialog open={shouldDisposition} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Call Disposition</DialogTitle>
            <DialogDescription className="text-center">
              Please select the outcome of this call before continuing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            <div className="w-full max-w-md space-y-3">
              <Label htmlFor="disposition" className="text-center block">Disposition</Label>
              <Select 
                value={selectedDisposition} 
                onValueChange={setSelectedDisposition}
              >
                <SelectTrigger id="disposition" className="w-full">
                  <SelectValue placeholder="Select a disposition" />
                </SelectTrigger>
                <SelectContent>
                  {campaignSettings?.queue_dispositions?.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.friendlyName}
                    </SelectItem>
                  ))}
                   <SelectItem key="da" value="da">
                      No Caller - Dead Air
                    </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleSubmitDisposition}
              disabled={!selectedDisposition || isSubmitting}
              className="w-full max-w-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Disposition'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Dashboard;