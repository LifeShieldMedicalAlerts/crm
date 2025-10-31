import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useContactCenter } from '@/contextproviders/ContactCenterContext';

export default function DeviceSettings({ isOpen, onOpenChange }) {
  const {
    audioDevices,
    selectedInputDevice,
    selectedOutputDevice,
    audioPermissionGranted,
    requestAudioPermissions,
    refreshAudioDevices,
    applyAudioDevices
  } = useContactCenter();

  const [localInputDevice, setLocalInputDevice] = useState(selectedInputDevice || "");
  const [localOutputDevice, setLocalOutputDevice] = useState(selectedOutputDevice || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update local state when context values change
  useEffect(() => {
    if (selectedInputDevice) {
      setLocalInputDevice(selectedInputDevice);
    }
  }, [selectedInputDevice]);

  useEffect(() => {
    if (selectedOutputDevice) {
      setLocalOutputDevice(selectedOutputDevice);
    }
  }, [selectedOutputDevice]);

  // Request permissions when dialog opens if not granted
  useEffect(() => {
    if (isOpen && !audioPermissionGranted) {
      handleRequestPermissions();
    }
  }, [isOpen, audioPermissionGranted]);

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      await requestAudioPermissions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshDevices = async () => {
    setIsRefreshing(true);
    try {
      await refreshAudioDevices();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApplyChanges = async () => {
    await applyAudioDevices(localInputDevice, localOutputDevice);
    onOpenChange(false);
  };

  const hasChanges = 
    localInputDevice !== selectedInputDevice || 
    localOutputDevice !== selectedOutputDevice;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Audio Device Settings
           
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Loading State */}
          {isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Requesting microphone permission...
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Not Granted */}
          {!audioPermissionGranted && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Microphone permission required to configure audio devices.</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRequestPermissions}
                >
                  Grant Permission
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Input Device Selection */}
          <div className="space-y-2">
            <Label htmlFor="input-device">Microphone (Input Device)</Label>
            <Select 
              value={localInputDevice} 
              onValueChange={setLocalInputDevice}
              disabled={!audioPermissionGranted || audioDevices.input.length === 0}
            >
              <SelectTrigger id="input-device">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.input.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localInputDevice && audioPermissionGranted && (
              <p className="text-xs text-muted-foreground">
                {audioDevices.input.find(d => d.deviceId === localInputDevice)?.label || 'Unknown device'}
              </p>
            )}
            {audioDevices.input.length === 0 && audioPermissionGranted && (
              <p className="text-xs text-destructive">
                No microphones detected. Please connect a microphone.
              </p>
            )}
          </div>

          {/* Output Device Selection */}
          <div className="space-y-2">
            <Label htmlFor="output-device">Speaker (Output Device)</Label>
            <Select 
              value={localOutputDevice} 
              onValueChange={setLocalOutputDevice}
              disabled={!audioPermissionGranted || audioDevices.output.length === 0}
            >
              <SelectTrigger id="output-device">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.output.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localOutputDevice && audioPermissionGranted && (
              <p className="text-xs text-muted-foreground">
                {audioDevices.output.find(d => d.deviceId === localOutputDevice)?.label || 'Unknown device'}
              </p>
            )}
            {audioDevices.output.length === 0 && audioPermissionGranted && (
              <p className="text-xs text-destructive">
                No speakers detected. Please connect speakers or headphones.
              </p>
            )}
          </div>

          {/* Device Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Changes will be applied to all current and future calls.</p>
            <p>If you don't see your device, try connecting it and clicking the refresh button.</p>
            {audioPermissionGranted && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                Microphone permission granted
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div>
              {hasChanges && (
                <p className="text-xs text-amber-600">
                  You have unsaved changes
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyChanges}
                disabled={!audioPermissionGranted || (!localInputDevice && !localOutputDevice) || !hasChanges}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}