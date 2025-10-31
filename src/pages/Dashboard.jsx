import { useAuth } from "@/contextproviders/AuthContext";
import { useContactCenter } from '../contextproviders/ContactCenterContext';
import { TopBar } from "@/components/top-bar"
import CustomerInformation from "@/components/customer-information";
import CallScript from "@/components/call-script";
import { Loader2, TriangleAlert } from "lucide-react"
import { useEffect } from "react";

function Dashboard() {
  const { user, dbUser, initError } = useAuth();
  const {
    sipState,
    sipError,
    currentCall

  } = useContactCenter();

  useEffect(() => {
    console.log("sipState ", sipState)
  }, [sipState])

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
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {currentCall ? (
          <>
            <div className="w-1/2 border-r bg-background">
              <CallScript />
            </div>
            <div className="w-1/2 overflow-y-auto">
              <CustomerInformation />
            </div>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default Dashboard;