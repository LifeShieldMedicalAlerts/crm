import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from "@/contextproviders/AuthContext";
import { Web } from 'sip.js';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';

const ContactCenterContext = createContext();

export function ContactCenterProvider({ children }) {
  const { user, dbUser, getBearerToken } = useAuth();
  const campaignAPI = useApi();
  const customerApi = useApi();
  const scriptApi = useApi();
  const dispositionApi = useApi();
  const configApi = useApi();
  const isConfigured = useRef(false);
  const wsRef = useRef(null);
  const wsAuthenticated = useRef(false);
  const reconnectTimeout = useRef(null);
  const simpleUserRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const callAnsweredSoundRef = useRef(null);

  const [sipState, setSipState] = useState('disconnected');
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [sipError, setSipError] = useState(null);
  const [pbxDetails, setPBXDetails] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [currentCallUUID, setCurrentCallUUID] = useState(null)

  const [shouldDisposition, setShouldDisposition] = useState(false);
  const [scriptData, setScriptData] = useState(null);
  const [productOfferings, setProductOfferings] = useState(null)
  const [campaignSettings, setCampaignSettings] = useState(null)
  const [matchedContacts, setMatchedContacts] = useState(null);
  const [customerData, setCustomerData] = useState()


  const [isHeld, setIsHeld] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [formattedStateTime, setFormattedStateTime] = useState('(00:00)');

  const [audioDevices, setAudioDevices] = useState({
    input: [],
    output: []
  });
  const [selectedInputDevice, setSelectedInputDevice] = useState(null);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

  useEffect(() => {
    console.log('customer data:', customerData)
  }, [customerData])


  const requestAudioPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      setAudioPermissionGranted(true);
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      console.log('Found audio devices:', {
        inputs: inputDevices.length,
        outputs: outputDevices.length
      });

      setAudioDevices({
        input: inputDevices,
        output: outputDevices
      });

      const storedInput = localStorage.getItem('selectedInputDevice');
      const storedOutput = localStorage.getItem('selectedOutputDevice');

      if (storedInput && inputDevices.find(d => d.deviceId === storedInput)) {
        setSelectedInputDevice(storedInput);
      } else if (inputDevices.length > 0) {
        const defaultDevice = inputDevices.find(d => d.deviceId === 'default') || inputDevices[0];
        setSelectedInputDevice(defaultDevice.deviceId);
      }

      if (storedOutput && outputDevices.find(d => d.deviceId === storedOutput)) {
        setSelectedOutputDevice(storedOutput);
      } else if (outputDevices.length > 0) {
        const defaultDevice = outputDevices.find(d => d.deviceId === 'default') || outputDevices[0];
        setSelectedOutputDevice(defaultDevice.deviceId);
      }

      stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      setAudioPermissionGranted(false);

      let errorMessage = "Microphone permission required for calls.";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone access denied. Please enable it in settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please connect an audio device.";
      }

      toast.error("Audio Permission Error", {
        description: errorMessage
      });

      return false;
    }
  }, []);


  const applyAudioDevices = useCallback(async (inputDeviceId, outputDeviceId) => {
    try {

      if (inputDeviceId) {
        localStorage.setItem('selectedInputDevice', inputDeviceId);
        setSelectedInputDevice(inputDeviceId);

        if (currentCall?.session) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: inputDeviceId } },
              video: false
            });

            const audioTrack = stream.getAudioTracks()[0];
            const sender = currentCall.session.sessionDescriptionHandler.peerConnection
              .getSenders()
              .find(s => s.track && s.track.kind === 'audio');

            if (sender) {
              await sender.replaceTrack(audioTrack);
              console.log('Input device updated on active call:', inputDeviceId);
            }
          } catch (error) {
            console.error('Error updating input device on active call:', error);
          }
        }
      }

      if (outputDeviceId) {
        localStorage.setItem('selectedOutputDevice', outputDeviceId);
        setSelectedOutputDevice(outputDeviceId);

        if (remoteAudioRef.current && remoteAudioRef.current.setSinkId) {
          try {
            await remoteAudioRef.current.setSinkId(outputDeviceId);
            console.log('Output device applied to audio element:', outputDeviceId);
          } catch (error) {
            console.error('Error setting audio output device:', error);
          }
        }
      }

      toast.success('Audio devices updated', {
        description: 'Your audio settings have been applied.'
      });

      return true;
    } catch (error) {
      console.error('Error applying audio devices:', error);
      toast.error('Failed to apply audio devices');
      return false;
    }
  }, [currentCall]);

  const updateCustomerData = async ({ data }) => {
    console.log('recieved data ', data);
    const updateResult = await customerApi.execute('/customer/update', 'POST', data);
  }

  const debouncedUpdate = useDebounce(updateCustomerData, 500);

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      setAudioDevices({
        input: inputDevices,
        output: outputDevices
      });

      if (selectedInputDevice && !inputDevices.find(d => d.deviceId === selectedInputDevice)) {
        console.warn('Selected input device no longer available, switching to default');
        const defaultDevice = inputDevices.find(d => d.deviceId === 'default') || inputDevices[0];

        if (defaultDevice) {
          await applyAudioDevices(defaultDevice.deviceId, null);
          toast.warning('Microphone disconnected', {
            description: `Switched to ${defaultDevice.label || 'default device'}`
          });
        } else {
          toast.error('No microphone available', {
            description: 'Please connect an audio input device'
          });
        }
      }

      if (selectedOutputDevice && !outputDevices.find(d => d.deviceId === selectedOutputDevice)) {
        console.warn('Selected output device no longer available, switching to default');
        const defaultDevice = outputDevices.find(d => d.deviceId === 'default') || outputDevices[0];

        if (defaultDevice) {
          await applyAudioDevices(null, defaultDevice.deviceId);
          toast.warning('Speaker disconnected', {
            description: `Switched to ${defaultDevice.label || 'default device'}`
          });
        } else {
          toast.error('No speaker available', {
            description: 'Please connect an audio output device'
          });
        }
      }

      console.log('Audio devices refreshed:', {
        inputs: inputDevices.length,
        outputs: outputDevices.length
      });
    } catch (error) {
      console.error('Error refreshing audio devices:', error);
    }
  }, [selectedInputDevice, selectedOutputDevice, applyAudioDevices]);

  const getAudioConstraints = useCallback(() => {
    const constraints = {
      audio: selectedInputDevice
        ? { deviceId: { exact: selectedInputDevice } }
        : true,
      video: false
    };
    console.log('Using audio constraints:', constraints);
    return constraints;
  }, [selectedInputDevice]);


const connectWebSocket = useCallback(async () => {
  if (!user?.userId) {
    shouldReconnectRef.current = false;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      wsAuthenticated.current = false;
      console.log('User logged out, WebSocket closed');
    } else {
      console.log('No user ID, skipping WebSocket connection');
    }
    return;
  }

  if (wsRef.current?.readyState === WebSocket.CONNECTING || 
      wsRef.current?.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connecting/connected, skipping');
    return;
  }

  shouldReconnectRef.current = true;
  console.log('Creating new WebSocket connection...');

  try {
    const token = await getBearerToken();
    
    if (!token) {
      console.error('No token available for WebSocket');
      return;
    }

    const ws = new WebSocket('wss://socket.lifeshieldmedicalalerts.com:8443/ws');
    
    let authAttempts = 0;
    const MAX_AUTH_ATTEMPTS = 3;
    
    ws.onopen = () => {
      console.log('WebSocket connected, authenticating...');
      setWsConnected(true);
      authAttempts = 0;
      
      ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message:', message);

        switch (message.type) {
          case 'auth_required':
            authAttempts++;
            console.log(`Auth required (attempt ${authAttempts}/${MAX_AUTH_ATTEMPTS})`);
            
            if (authAttempts > MAX_AUTH_ATTEMPTS) {
              console.error('Max auth attempts reached, closing connection');
              ws.close();
              return;
            }

            console.log('Getting fresh token for WebSocket auth...');
            const freshToken = await getBearerToken();
            
            if (!freshToken) {
              console.error('Failed to get fresh token for WebSocket');
              ws.close();
              return;
            }
            
            ws.send(JSON.stringify({
              type: 'auth',
              token: freshToken
            }));
            break;

          case 'authenticated':
            console.log('WebSocket authenticated!');
            wsAuthenticated.current = true;
            authAttempts = 0;
            
            ws.send(JSON.stringify({
              type: 'sync',
              user_id: user.userId
            }));
            break;

          case 'sync_response':
            console.log('Received sync data');
            setPBXDetails(message.data || {});
            if (message.data?.status === 'Logged Out') {
              console.log('Updating Status To On Break...');
              updateStatus('On Break');
            }
            break;

          case 'database_update':
            console.log('Database update received');
            setPBXDetails(message.data);
            break;

          case 'status_update_ack':
            console.log('Status update acknowledged');
            break;

          case 'pong':
            break;

          case 'error':
            console.error('WebSocket error:', message.message);
            
            if (message.reason === 'token_expired' || message.message?.includes('Authentication failed')) {
              console.log('Auth error detected, will reconnect with fresh token after delay');
            }
            
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
              wsAuthenticated.current = false;
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSipError('WebSocket connection error');
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setWsConnected(false);
      wsAuthenticated.current = false;
      wsRef.current = null;

      if (!shouldReconnectRef.current || !user?.userId) {
        console.log('Reconnection disabled (user logged out)');
        return;
      }

      const baseDelay = 2000;
      const maxDelay = 30000;
      const reconnectDelay = Math.min(baseDelay * Math.pow(1.5, authAttempts), maxDelay);
      
      console.log(`Will attempt to reconnect in ${reconnectDelay}ms...`);
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket();
      }, reconnectDelay);
    };

    wsRef.current = ws;
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    toast.error('Failed to connect to PBX server');
  }
}, [user?.userId, getBearerToken]);


  const updateStatus = useCallback((newStatus) => {
    if (!wsRef.current || !wsAuthenticated.current) {
      console.error('WebSocket not connected or authenticated');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'update_status',
      status: newStatus
    }));
  }, []);


  const sendPing = useCallback(() => {
    if (!wsRef.current || !wsAuthenticated.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'ping'
    }));
  }, []);

  const handleDisposition = useCallback(async (disposition) => {
    if (!disposition) {
      toast.error('Missing Call Disposition');
      return false
    }
    try {
      const dispoResult = await dispositionApi.execute('/call/disposition', 'POST', { callId: currentCallUUID, disposition: disposition });

      if (dispoResult?.success === true) {
        setCurrentCall(null);
        setCurrentCallUUID(null);
        setIncomingCall(null);
        setShouldDisposition(false);

        toast.success('Call dispositioned.');
        return true;
      } else {
        console.error('Failed to disposition call: ', JSON.stringify(dispoResult?.data || {}));
        toast.error('Failed to save disposition');
        return false;
      }

    } catch (error) {
      console.error('Error saving disposition:', error);
      toast.error('Failed to save disposition');
      return false;
    }
  }, [currentCallUUID])

  useEffect(() => {
    if (!pbxDetails) {
      setFormattedStateTime('(00:00)');
      return;
    }

    const formatTime = (seconds) => {
      const absSeconds = Math.abs(seconds);
      const mins = Math.floor(absSeconds / 60);
      const secs = absSeconds % 60;
      const sign = seconds < 0 ? '-' : '';
      return `(${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')})`;
    };

    const updateTimer = () => {
      const elapsedTime = Math.floor((Date.now() - (pbxDetails.last_status_change * 1000)) / 1000);

      if (pbxDetails.status === 'Wrap Up') {
        const countdownTime = Math.min(0, elapsedTime - pbxDetails.wrap_up_time);
        setFormattedStateTime(formatTime(countdownTime));
        if (countdownTime === 0) {
          console.log('Setting Idle Status');
          if (shouldDisposition === true) {
            handleDisposition('nd');
          }
          updateStatus('Idle');
        }
      } else {
        setFormattedStateTime(formatTime(Math.max(0, elapsedTime)));
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [pbxDetails, shouldDisposition]);

  useEffect(() => {
  callAnsweredSoundRef.current = new Audio('/incoming-call.mp3');
  callAnsweredSoundRef.current.volume = 0.8;
  
  return () => {
    if (callAnsweredSoundRef.current) {
      callAnsweredSoundRef.current.pause();
      callAnsweredSoundRef.current = null;
    }
  };
}, []);

  useEffect(() => {
    requestAudioPermissions();

    const handleDeviceChange = () => {
      console.log('Audio device change detected');
      refreshAudioDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [requestAudioPermissions, refreshAudioDevices]);

  useEffect(() => {
    if (user?.userId && !wsRef.current) {
      console.log('Initializing WebSocket connection from useEffect');
      connectWebSocket();
    }

    return () => {
      console.log('Cleaning up WebSocket connection');
      shouldReconnectRef.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        wsAuthenticated.current = false;
      }
    };
  }, [user?.userId]);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      sendPing();
    }, 10000);

    return () => clearInterval(pingInterval);
  }, [sendPing]);


  useEffect(() => {
    if (isConfigured.current === true) {
      console.log('SIP already configured, skipping');
      return;
    }

    if (!dbUser?.agent_id || !dbUser?.sip_password) {
      console.log('Missing SIP credentials');
      return;
    }

    if (!audioPermissionGranted) {
      console.log('Waiting for audio permission before configuring SIP');
      return;
    }

    console.log('Configuring SIP.js...');
    isConfigured.current = true;


    const remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.id = 'sip-remote-audio';
    document.body.appendChild(remoteAudio);
    remoteAudioRef.current = remoteAudio;


    if (selectedOutputDevice && remoteAudio.setSinkId) {
      remoteAudio.setSinkId(selectedOutputDevice)
        .then(() => {
          console.log('Audio output device set to:', selectedOutputDevice);
        })
        .catch(error => {
          console.error('Error setting audio output device:', error);
        });
    }


    const audioConstraints = {
      audio: selectedInputDevice
        ? { deviceId: { exact: selectedInputDevice } }
        : true,
      video: false
    };

    const simpleUser = new Web.SimpleUser('wss://sip.lifeshieldmedicalalerts.com:9443', {
      aor: `sip:${dbUser.agent_id}@sip.lifeshieldmedicalalerts.com`,
      media: {
        constraints: audioConstraints,
        remote: {
          audio: remoteAudio
        }
      },
      userAgentOptions: {
        authorizationUsername: dbUser.agent_id,
        authorizationPassword: dbUser.sip_password,
        displayName: dbUser.name || dbUser.agent_id,
        hackViaTcp: false,
        contactName: dbUser.agent_id,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: audioConstraints
        }
      }
    });

    simpleUser.delegate = {
      onCallCreated: () => {
        console.log('Call created');
      },
      onCallAnswered: () => {
        console.log('Call answered');
        setCurrentCall(simpleUser);

        if (callAnsweredSoundRef.current) {
          callAnsweredSoundRef.current.currentTime = 0;
          callAnsweredSoundRef.current.play().catch(err => {
            console.error('Error playing call answered sound:', err);
          });
        }
      },
      onCallHangup: () => {
        console.log('Call ended');
        setShouldDisposition(true)
        toast.info('Call Ended');
      },
      onCallReceived: async () => {
        console.log('!!!!! INCOMING CALL RECEIVED !!!!!');
        const session = simpleUser.session;
        console.log("Session ", session)
        const callerNumber = session?.remoteIdentity?.uri?.user || 'Unknown';
        console.log('Caller number:', callerNumber);
        const queueName = session?.request?.getHeader('X-Queue-Name') || null;
        console.log('Queue name:', queueName);
        const callUUID = session?.request?.getHeader('X-Call-UUID') || null;
        setCurrentCallUUID(callUUID)
        console.log('Call UUID:', callUUID);




        if (queueName && callerNumber) {

          const [configResult, scriptResult, campaignResult, matchResult] = await Promise.all([
            configApi.execute('/config', 'POST', {}),
            scriptApi.execute('/campaign/fetchscript', 'POST', { fetchFor: queueName }),
            campaignAPI.execute('/campaign/fetchsettings', 'POST', { fetchFor: queueName }),
            customerApi.execute('/customer/match/byphone', 'POST', { number: callerNumber })
          ]);

          if (configResult?.success === true) {
            console.log('Setting product offeerings:', configResult?.data);
            setProductOfferings(configResult?.data);
          } else {
            toast.error('Failed to fetch pricing information.');
          }
          if (scriptResult?.success !== false) {
            console.log('Setting script data:', scriptResult?.data?.script_content);
            setScriptData(scriptResult?.data?.script_content);
          } else {
            toast.error('Failed to fetch script data');
          }

          if (campaignResult?.success !== false) {
            console.log('Setting campaign data:', campaignResult?.data);
            setCampaignSettings(campaignResult?.data);
          } else {
            toast.error('Failed to fetch script data');
          }

          if (matchResult?.success === true) {
            if (matchResult?.data && Array.isArray(matchResult.data)) {
              if (matchResult.data.length === 0) {
                //No customer found, create fresh one
                const creationResult = await customerApi.execute('/customer/create', 'POST', { number: callerNumber })
                if (creationResult?.success === true && creationResult?.data) {
                  setCustomerData(creationResult.data);
                } else {
                  toast.error('Failed to create new customer.');
                }
              } else if (matchResult.data.length === 1) {
                const pullCustomer = await customerApi.execute('/customer/load', 'POST', { customerId: matchResult.data[0]?.customer_id });
                if (pullCustomer?.success === true && pullCustomer?.data) {
                  setCustomerData(pullCustomer.data)
                } else {
                  toast.error('Failed to load customer data.')
                }
              } else {
                setMatchedContacts(matchResult.data)
              }
            } else {
              toast.error('Unknown customer data object returned');
            }
          } else {
            toast.error('Failed to load customer information');
          }
        }

        setIncomingCall({
          callerNumber,
          simpleUser
        });

        toast.info('Incoming call', {
          description: `From: ${callerNumber}`
        });

        await simpleUser.answer();
      },
      onRegistered: () => {
        console.log('SIP registered');
        setSipState('registered');
      },
      onUnregistered: () => {
        console.log('SIP unregistered');
        setSipState('disconnected');
      },
      onServerConnect: () => {
        console.log('Connected to SIP server');
        setSipState('connected');
      },
      onServerDisconnect: () => {
        console.log('Disconnected from SIP server');
        setSipState('disconnected');
      }
    };

    simpleUser.connect()
      .then(() => {
        console.log('SIP.js connected');
        return simpleUser.register();
      })
      .then(() => {
        console.log('SIP.js registered');
      })
      .catch((error) => {
        console.error('SIP.js connection error:', error);
        setSipState('disconnected');
      });

    simpleUserRef.current = simpleUser;

    return () => {
      console.log('Cleaning up SIP connection');
      const audio = document.getElementById('sip-remote-audio');
      if (audio) {
        audio.remove();
      }
      remoteAudioRef.current = null;

      if (simpleUserRef.current) {
        simpleUserRef.current.unregister()
          .then(() => simpleUserRef.current.disconnect())
          .catch(console.error);
      }
    };
  }, [dbUser?.agent_id, dbUser?.sip_password, audioPermissionGranted]);

  useEffect(() => {
    console.log('PBX Details updated:', pbxDetails);
  }, [pbxDetails]);


  // Make an outbound call
  const makeCall = useCallback(async (phoneNumber) => {
    if (!simpleUserRef.current) {
      console.error('SIP not initialized');
      toast.error('SIP not ready');
      return;
    }

    if (!audioPermissionGranted) {
      toast.error('Microphone permission required');
      await requestAudioPermissions();
      return;
    }

    try {
      await simpleUserRef.current.call(`sip:${phoneNumber}@sip.lifeshieldmedicalalerts.com`);
      setCurrentCall(simpleUserRef.current);
      toast.success('Call initiated');
    } catch (error) {
      console.error('Error making call:', error);
      toast.error('Failed to make call');
    }
  }, [audioPermissionGranted, requestAudioPermissions]);

  const answerCall = useCallback(async () => {
    if (!incomingCall?.simpleUser) {
      console.error('No incoming call to answer');
      return;
    }

    try {
      console.log('Answering call...');
      await incomingCall.simpleUser.answer();
      setCurrentCall(incomingCall.simpleUser);
      setIncomingCall(null);
      toast.success('Call answered');
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
    }
  }, [incomingCall]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall?.simpleUser) {
      console.error('No incoming call to reject');
      return;
    }

    try {
      await incomingCall.simpleUser.decline();
      setIncomingCall(null);
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
    }
  }, [incomingCall]);

  const hangupCall = useCallback(async () => {
    if (!currentCall) {
      console.error('No active call to hangup');
      return;
    }

    try {
      await currentCall.hangup();
    } catch (error) {
      console.error('Error hanging up call:', error);
      toast.error('Failed to hangup');
    }
  }, [currentCall]);

  const toggleMute = useCallback(async () => {
    if (!currentCall) return;

    try {
      if (currentCall.isMuted()) {
        await currentCall.unmute();
        setIsMuted(false)
        toast.success('Unmuted');
      } else {
        await currentCall.mute();
        setIsMuted(true)
        toast.success('Muted');
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to toggle mute');
    }
  }, [currentCall]);

  const toggleHold = useCallback(async () => {
    if (!currentCall) return;

    try {
      if (currentCall.isHeld()) {
        await currentCall.unhold();
        setIsHeld(false);
        toast.success('Call resumed');
      } else {
        await currentCall.hold();
        setIsHeld(true);
        toast.success('Call on hold');
      }
    } catch (error) {
      console.error('Error toggling hold:', error);
      toast.error('Failed to toggle hold');
    }
  }, [currentCall]);

  const contextValue = {
    sipError,
    sipState,
    currentCall,
    incomingCall,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    toggleMute,
    isHeld,
    isMuted,
    toggleHold,
    wsConnected,
    updateStatus,
    pbxDetails,
    formattedStateTime,
    // Audio device management
    audioDevices,
    selectedInputDevice,
    selectedOutputDevice,
    audioPermissionGranted,
    requestAudioPermissions,
    refreshAudioDevices,
    applyAudioDevices,

    shouldDisposition,
    handleDisposition,
    currentCallUUID,
    scriptData,
    productOfferings,
    campaignSettings,
    matchedContacts,
    customerData,
    updateCustomerData,
    debouncedUpdate

  };

  return (
    <ContactCenterContext.Provider value={contextValue}>
      {children}
    </ContactCenterContext.Provider>
  );
}

export function useContactCenter() {
  const context = useContext(ContactCenterContext);
  if (!context) {
    throw new Error('useContactCenter must be used within a ContactCenterProvider');
  }
  return context;
}