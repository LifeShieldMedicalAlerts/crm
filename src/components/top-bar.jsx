import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  PhoneOff, 
  Pause, 
  Play, 
  Menu, 
  LogOut,
  Settings,
  User,
  Phone,
  Mic,
  MicOff,
  Clock
} from "lucide-react"

import { allStatuses, selectableStatuses } from "@/config/config"

// Import the contact center hook
import { useAuth } from "@/contextproviders/AuthContext"
import { useContactCenter } from '../contextproviders/ContactCenterContext';
import DeviceSettings from "../components/device-settings"
import { toast } from "sonner"

export function TopBar() {
  const {dbUser, logout} = useAuth();
  const {
    fetchCustomerData,
    sipError,
    sipState,
    currentCall,
    shouldDisposition,
    makeCall,
    hangupCall,
    toggleMute,
    toggleHold,
    isHeld,
    isMuted,
    updateStatus,
    pbxDetails,
    formattedStateTime
  } = useContactCenter();
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);




  const handleStateChange = (value) => {
    if(!value)return;

    if(selectableStatuses.includes(value)){
      updateStatus(value)
    }else{
      toast.error('Invalid Status Selected')
    }
  };



  const testOutboundCall = (number) =>{
    makeCall('8603919592')
  }

  const attemptLogout = useCallback(async () =>{
    if(!currentCall && shouldDisposition === false){
      //all clear
      updateStatus('Logged Out');
      await logout();
    }else{
      if(shouldDisposition === true){
        toast.error('Failed to log out', {
          description: 'Please disposition your call before logging out.'
        });
      }else{
        toast.error('Failed to log out', {
          description: 'Please end and disposition your call before logging out.'
        });
      }
    }
  },[currentCall, shouldDisposition])

  return (
    <>
    <div className="w-full h-auto py-3 px-6 shadow-md bg-background border-b">
      <div className="flex items-center justify-between">
        {/* Left Section - Agent State */}
        <div className="flex items-center space-x-4">
          <Select value={pbxDetails?.status} onValueChange={handleStateChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {selectableStatuses?.map((s) => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full"></div>
                    <span>{s}</span>
                  </div>
                </SelectItem>
              ))}
              {pbxDetails?.status && !selectableStatuses?.includes(pbxDetails.status) && (
                 <SelectItem key={pbxDetails.status} value={pbxDetails.status}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full"></div>
                    <span>{pbxDetails.status}</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
           <div className="flex items-center space-x-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">State Time</div>
                <div className='font-mono text-sm'>
                  {formattedStateTime}
                </div>
              </div>
            </div>
        </div>

        {/* Middle Section - Call Controls */}
        <div className="flex items-center space-x-4">
          {pbxDetails?.uuid && (
            <div className="flex items-center space-x-4 bg-muted/50 px-4 py-1 rounded-lg">
              <Button
                variant={isHeld ? "secondary" : "outline"}
                size="sm"
                onClick={toggleHold}
              >
                {isHeld ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>

               <Button
                variant={isMuted ? "secondary" : "outline"}
                size="sm"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={hangupCall}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right Section - Agent Info & Menu */}
        <div className="flex items-center space-x-3">
          {/* Agent Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full`}></div>
            <span className="text-sm text-muted-foreground">
              {sipState === 'registered' ? 'Online' : 'Connecting...'}
            </span>
          </div>
          {/* Agent Info */}
          <div className="text-right">
            <div className="text-sm font-medium">{dbUser?.first_name} {dbUser?.last_name}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
             <DropdownMenuItem onClick={() => setDeviceSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
              <DropdownMenuItem onClick={attemptLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    <DeviceSettings 
        isOpen={deviceSettingsOpen} 
        onOpenChange={setDeviceSettingsOpen} 
      />
      </>
  );
}