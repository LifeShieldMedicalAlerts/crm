import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from "@/contextproviders/AuthContext";
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  RegistererState
} from 'sip.js';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';

const ContactCenterContext = createContext();


const CallState = {
  IDLE: 'idle',
  RINGING_IN: 'ringing_in',
  RINGING_OUT: 'ringing_out',
  ESTABLISHING: 'establishing',
  ESTABLISHED: 'established',
  TERMINATING: 'terminating',
  TERMINATED: 'terminated'
};

export function ContactCenterProvider({ children }) {
  const { user, dbUser, getBearerToken } = useAuth();
  const campaignAPI = useApi();
  const customerApi = useApi();
  const scriptApi = useApi();
  const dispositionApi = useApi();
  const configApi = useApi();


  const userAgentRef = useRef(null);
  const registererRef = useRef(null);
  const currentSessionRef = useRef(null);
  const isConfigured = useRef(false);
  const sipReconnectAttempts = useRef(0);
  const sipReconnectTimeout = useRef(null);
  const sipShouldReconnect = useRef(true);


  const wsRef = useRef(null);
  const wsAuthenticated = useRef(false);
  const reconnectTimeout = useRef(null);
  const shouldReconnectRef = useRef(true);
  const wsReconnectAttempts = useRef(0);


  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const callAnsweredSoundRef = useRef(null);
  const ringingToneRef = useRef(null);


  const [sipState, setSipState] = useState('disconnected');
  const [callState, setCallState] = useState(CallState.IDLE);
  const [sipError, setSipError] = useState(null);


  const [currentCallUUID, setCurrentCallUUID] = useState(null);
  const [currentQueueName, setCurrentQueueName] = useState(null);
  const [callerNumber, setCallerNumber] = useState(null);
  const [currentCallIsOutbound, setCurrentCallIsOutbound] = useState(false);
  const obCallRef = useRef(false);


  const wasEstablishedRef = useRef(false);


  const [isHeld, setIsHeld] = useState(false);
  const [isMuted, setIsMuted] = useState(false);


  const [shouldDisposition, setShouldDisposition] = useState(false);
  const [canCallBack, setCanCallBack] = useState(false);
  const [scriptData, setScriptData] = useState(null);
  const [productOfferings, setProductOfferings] = useState(null);
  const [campaignSettings, setCampaignSettings] = useState(null);
  const [matchedContacts, setMatchedContacts] = useState(null);
  const [customerData, setCustomerData] = useState();


  const [pbxDetails, setPBXDetails] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [formattedStateTime, setFormattedStateTime] = useState('(00:00)');

  const [audioDevices, setAudioDevices] = useState({ input: [], output: [] });
  const [selectedInputDevice, setSelectedInputDevice] = useState(null);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

  useEffect(() => {
    console.log('Call state changed:', callState);
  }, [callState]);

  useEffect(() => {
    console.log('Customer data:', customerData);
  }, [customerData]);

  useEffect(() => {
    obCallRef.current = currentCallIsOutbound;
  }, [currentCallIsOutbound]);

  const requestAudioPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setAudioPermissionGranted(true);
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      console.log('Found audio devices:', { inputs: inputDevices.length, outputs: outputDevices.length });
      setAudioDevices({ input: inputDevices, output: outputDevices });

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

      toast.error("Audio Permission Error", { description: errorMessage });
      return false;
    }
  }, []);

  const applyAudioDevices = useCallback(async (inputDeviceId, outputDeviceId) => {
    try {
      if (inputDeviceId) {
        localStorage.setItem('selectedInputDevice', inputDeviceId);
        setSelectedInputDevice(inputDeviceId);

        if (currentSessionRef.current && localStreamRef.current) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: inputDeviceId } },
              video: false
            });

            const newTrack = newStream.getAudioTracks()[0];
            const sdh = currentSessionRef.current.sessionDescriptionHandler;
            const pc = sdh?.peerConnection;

            if (pc) {
              const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
              if (sender) {
                await sender.replaceTrack(newTrack);
                console.log('Input device updated on active call:', inputDeviceId);
              }
            }

            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = newStream;
          } catch (error) {
            console.error('Error updating input device on active call:', error);
          }
        }
      }

      if (outputDeviceId) {
        localStorage.setItem('selectedOutputDevice', outputDeviceId);
        setSelectedOutputDevice(outputDeviceId);

        if (remoteAudioRef.current?.setSinkId) {
          try {
            await remoteAudioRef.current.setSinkId(outputDeviceId);
            console.log('Output device applied to audio element:', outputDeviceId);
          } catch (error) {
            console.error('Error setting audio output device:', error);
          }
        }
      }

      toast.success('Audio devices updated', { description: 'Your audio settings have been applied.' });
      return true;
    } catch (error) {
      console.error('Error applying audio devices:', error);
      toast.error('Failed to apply audio devices');
      return false;
    }
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      setAudioDevices({ input: inputDevices, output: outputDevices });

      if (selectedInputDevice && !inputDevices.find(d => d.deviceId === selectedInputDevice)) {
        const defaultDevice = inputDevices.find(d => d.deviceId === 'default') || inputDevices[0];
        if (defaultDevice) {
          await applyAudioDevices(defaultDevice.deviceId, null);
          toast.warning('Microphone disconnected', { description: `Switched to ${defaultDevice.label || 'default device'}` });
        }
      }

      if (selectedOutputDevice && !outputDevices.find(d => d.deviceId === selectedOutputDevice)) {
        const defaultDevice = outputDevices.find(d => d.deviceId === 'default') || outputDevices[0];
        if (defaultDevice) {
          await applyAudioDevices(null, defaultDevice.deviceId);
          toast.warning('Speaker disconnected', { description: `Switched to ${defaultDevice.label || 'default device'}` });
        }
      }
    } catch (error) {
      console.error('Error refreshing audio devices:', error);
    }
  }, [selectedInputDevice, selectedOutputDevice, applyAudioDevices]);





  const clearCallState = useCallback(() => {
    console.log('Clearing all call state');
    currentSessionRef.current = null;
    wasEstablishedRef.current = false;
    setCallState(CallState.IDLE);
    setCurrentCallUUID(null);
    setCurrentQueueName(null);
    setCallerNumber(null);
    setShouldDisposition(false);
    setCurrentCallIsOutbound(false);
    setCanCallBack(false);
    setScriptData(null);
    setProductOfferings(null);
    setCampaignSettings(null);
    setMatchedContacts(null);
    setCustomerData(undefined);
    setIsHeld(false);
    setIsMuted(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  const getAudioConstraints = useCallback(() => {
    return {
      audio: selectedInputDevice ? { deviceId: { exact: selectedInputDevice } } : true,
      video: false
    };
  }, [selectedInputDevice]);





  const setupRemoteMedia = useCallback((session) => {
    const sdh = session.sessionDescriptionHandler;
    if (!sdh) return;

    const pc = sdh.peerConnection;
    if (!pc) return;

    pc.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        const remoteStream = new MediaStream([event.track]);
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(err => console.error('Error playing remote audio:', err));
      }
    };

    pc.getReceivers().forEach(receiver => {
      if (receiver.track && receiver.track.kind === 'audio' && remoteAudioRef.current) {
        const remoteStream = new MediaStream([receiver.track]);
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(err => console.error('Error playing remote audio:', err));
      }
    });
  }, []);

  const cleanupMedia = useCallback(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);





  const updateStatus = useCallback((newStatus) => {
    if (!wsRef.current || !wsAuthenticated.current) return;
    wsRef.current.send(JSON.stringify({ type: 'update_status', status: newStatus }));
  }, []);

  const sendPing = useCallback(() => {
    if (!wsRef.current || !wsAuthenticated.current) return;
    wsRef.current.send(JSON.stringify({ type: 'ping' }));
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!user?.userId) {
      shouldReconnectRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        wsAuthenticated.current = false;
      }
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) return;

    shouldReconnectRef.current = true;

    try {
      const token = await getBearerToken();
      if (!token) return;

      const ws = new WebSocket('wss://socket.lifeshieldmedicalalerts.com:8443/ws');

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        wsReconnectAttempts.current = 0;
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'auth_required':
              const freshToken = await getBearerToken();
              if (!freshToken) { ws.close(); return; }
              ws.send(JSON.stringify({ type: 'auth', token: freshToken }));
              break;
            case 'authenticated':
              wsAuthenticated.current = true;
              ws.send(JSON.stringify({ type: 'sync', user_id: user.userId }));
              break;
            case 'sync_response':
              setPBXDetails(message.data || {});
              if (message.data?.status === 'Logged Out') updateStatus('On Break');
              break;
            case 'database_update':
              setPBXDetails(message.data);
              break;
            case 'error':
              console.error('WebSocket error message:', message.message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code);
        setWsConnected(false);
        wsAuthenticated.current = false;
        wsRef.current = null;


        if (!shouldReconnectRef.current || !user?.userId) {
          console.log('WebSocket: not reconnecting (intentional disconnect)');
          return;
        }


        const attempt = wsReconnectAttempts.current;
        const delay = attempt === 0 ? 100 : Math.min(2000 * Math.pow(2, attempt - 1), 30000);
        wsReconnectAttempts.current++;

        console.log(`WebSocket: reconnect attempt ${attempt + 1} in ${delay}ms`);

        reconnectTimeout.current = setTimeout(() => {
          if (shouldReconnectRef.current && user?.userId) {
            connectWebSocket();
          }
        }, delay);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      toast.error('Failed to connect to PBX server');
    }
  }, [user?.userId, getBearerToken, updateStatus]);





  const setupSessionListeners = useCallback((session, isOutbound = false) => {
    console.log('Setting up session listeners, isOutbound:', isOutbound);

    session.stateChange.addListener((state) => {
      console.log('Session state changed:', state);

      switch (state) {
        case SessionState.Establishing:
          setCallState(CallState.ESTABLISHING);
          break;

        case SessionState.Established:
          console.log('Session ESTABLISHED call is now active');
          wasEstablishedRef.current = true;
          setCallState(CallState.ESTABLISHED);

          if (ringingToneRef.current) {
            ringingToneRef.current.pause();
            ringingToneRef.current.currentTime = 0;
          }

          if (callAnsweredSoundRef.current) {
            callAnsweredSoundRef.current.currentTime = 0;
            callAnsweredSoundRef.current.play().catch(console.error);
          }

          setupRemoteMedia(session);
          break;

        case SessionState.Terminating:
          setCallState(CallState.TERMINATING);
          break;

        case SessionState.Terminated:
          console.log('Session TERMINATED, wasEstablished:', wasEstablishedRef.current);

          if (ringingToneRef.current) {
            ringingToneRef.current.pause();
            ringingToneRef.current.currentTime = 0;
          }

          cleanupMedia();

          if (wasEstablishedRef.current) {
            console.log('Call was established, requiring disposition');
            setShouldDisposition(true);
            setCallState(CallState.IDLE);
            if (obCallRef.current) updateStatus('Wrap Up');
            toast.info('Call Ended');
          } else {
            console.log('Call ended before being established, no disposition needed');
            clearCallState();
            toast.info('Call ended before connection');
          }

          currentSessionRef.current = null;
          break;
      }
    });

    session.delegate = {
      onBye: () => console.log('Received BYE from remote'),
      onInfo: (info) => console.log('Received INFO:', info),
      onRefer: (referral) => console.log('Received REFER:', referral),
    };

    currentSessionRef.current = session;
  }, [setupRemoteMedia, cleanupMedia, clearCallState, updateStatus]);





  const handleIncomingInvite = useCallback(async (invitation) => {
    console.log('!!!!! INCOMING INVITE RECEIVED !!!!!');

    wasEstablishedRef.current = false;

    const remoteUri = invitation.remoteIdentity?.uri;
    const incomingNumber = remoteUri?.user || 'Unknown';
    const request = invitation.request;
    const queueName = request?.getHeader('X-Queue-Name') || null;
    const callUUID = request?.getHeader('X-Call-UUID') || null;

    console.log('Caller:', incomingNumber, 'Queue:', queueName, 'UUID:', callUUID);

    setCallerNumber(incomingNumber);
    setCurrentQueueName(queueName);
    setCurrentCallUUID(callUUID);
    setCurrentCallIsOutbound(false);
    setCallState(CallState.RINGING_IN);

    setupSessionListeners(invitation, false);

    const originalDelegate = invitation.delegate || {};
    invitation.delegate = {
      ...originalDelegate,
      onCancel: () => {
        console.log('INVITE was CANCELLED by caller before answer');
        clearCallState();
        toast.info('Caller hung up');
      }
    };

    if (queueName && incomingNumber) {
      try {
        const [configResult, scriptResult, campaignResult, matchResult] = await Promise.all([
          configApi.execute('/config', 'POST', {}),
          scriptApi.execute('/campaign/fetchscript', 'POST', { fetchFor: queueName }),
          campaignAPI.execute('/campaign/fetchsettings', 'POST', { fetchFor: queueName }),
          customerApi.execute('/customer/match/byphone', 'POST', { number: incomingNumber })
        ]);

        if (configResult?.success) setProductOfferings(configResult?.data);
        if (scriptResult?.success !== false) setScriptData(scriptResult?.data?.script_content);
        if (campaignResult?.success !== false) setCampaignSettings(campaignResult?.data);

        if (matchResult?.success && matchResult?.data && Array.isArray(matchResult.data)) {
          if (matchResult.data.length === 0) {
            const creationResult = await customerApi.execute('/customer/create', 'POST', { number: incomingNumber });
            if (creationResult?.success && creationResult?.data) setCustomerData(creationResult.data);
          } else if (matchResult.data.length === 1) {
            const pullCustomer = await customerApi.execute('/customer/load', 'POST', { customerId: matchResult.data[0]?.customer_id });
            if (pullCustomer?.success && pullCustomer?.data) setCustomerData(pullCustomer.data);
          } else {
            setMatchedContacts(matchResult.data);
          }
        }
      } catch (error) {
        console.error('Error fetching call data:', error);
      }
    }

    toast.info('Incoming call', { description: `From: ${incomingNumber}` });

    try {
      await invitation.accept({
        sessionDescriptionHandlerOptions: { constraints: getAudioConstraints() }
      });
      console.log('INVITE accepted');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to answer call');
      clearCallState();
    }
  }, [setupSessionListeners, clearCallState, getAudioConstraints, configApi, scriptApi, campaignAPI, customerApi]);





  const handleDisposition = useCallback(async (disposition) => {
    if (!disposition) {
      toast.error('Missing Call Disposition');
      return false;
    }

    if (currentCallUUID) {
      try {
        const result = await dispositionApi.execute('/call/disposition', 'POST', { callId: currentCallUUID, disposition });
        if (result?.success) {
          clearCallState();
          toast.success('Call dispositioned.');
          return true;
        }
        toast.error('Failed to save disposition');
        return false;
      } catch (error) {
        toast.error('Failed to save disposition');
        return false;
      }
    } else if (currentCallIsOutbound) {
      try {
        const result = await dispositionApi.execute('/call/dispositionoutbound', 'POST', { agentId: dbUser?.agent_id, disposition });
        if (result?.success) {
          clearCallState();
          toast.success('Call dispositioned.');
          return true;
        }
        toast.error('Failed to save disposition');
        return false;
      } catch (error) {
        toast.error('Failed to save disposition');
        return false;
      }
    } else {
      clearCallState();
      return true;
    }
  }, [currentCallUUID, currentCallIsOutbound, dbUser?.agent_id, clearCallState, dispositionApi]);

  const handleDispositionAndCallBack = useCallback(async (disposition) => {
    if (!disposition) {
      toast.error('Missing Call Disposition');
      return false;
    }

    const targetNumber = callerNumber;

    if (currentCallUUID) {
      try {
        const result = await dispositionApi.execute('/call/disposition', 'POST', { callId: currentCallUUID, disposition });
        if (result?.success) {
          toast.success('Call dispositioned.');
          setCurrentCallUUID(null);
          setCurrentQueueName(null);
          setShouldDisposition(false);
          wasEstablishedRef.current = false;
          await makeCall(targetNumber);
          updateStatus('Callback');
          return true;
        }
        toast.error('Failed to save disposition');
        return false;
      } catch (error) {
        toast.error('Failed to save disposition');
        return false;
      }
    } else {
      clearCallState();
      return true;
    }
  }, [currentCallUUID, callerNumber, clearCallState, dispositionApi, updateStatus]);





  const updateCustomerData = useCallback(async ({ data }) => {
    if (currentQueueName && currentQueueName !== 'training@sip.lifeshieldmedicalalerts.com') {
      await customerApi.execute('/customer/update', 'POST', data);
    } else if (currentCallIsOutbound) {
      await customerApi.execute('/customer/update', 'POST', data);
    }
    return true;
  }, [currentQueueName, currentCallIsOutbound, customerApi]);

  const debouncedUpdate = useDebounce(updateCustomerData, 500);





  const makeCall = useCallback(async (phoneNumber) => {
    if (!userAgentRef.current) {
      toast.error('SIP not ready');
      return;
    }

    if (!audioPermissionGranted) {
      toast.error('Microphone permission required');
      await requestAudioPermissions();
      return;
    }

    try {
      wasEstablishedRef.current = false;
      setCurrentCallIsOutbound(true);
      setCallerNumber(phoneNumber);
      setCallState(CallState.RINGING_OUT);

      if (ringingToneRef.current) {
        ringingToneRef.current.currentTime = 0;
        ringingToneRef.current.play().catch(console.error);
      }

      const targetUri = UserAgent.makeURI(`sip:${phoneNumber}@sip.lifeshieldmedicalalerts.com`);
      if (!targetUri) throw new Error('Failed to create target URI');

      const inviter = new Inviter(userAgentRef.current, targetUri, {
        sessionDescriptionHandlerOptions: { constraints: getAudioConstraints() }
      });

      setupSessionListeners(inviter, true);
      await inviter.invite();
      toast.success('Call initiated');
    } catch (error) {
      console.error('Error making call:', error);
      toast.error('Failed to make call');
      clearCallState();
      if (ringingToneRef.current) {
        ringingToneRef.current.pause();
        ringingToneRef.current.currentTime = 0;
      }
    }
  }, [audioPermissionGranted, requestAudioPermissions, getAudioConstraints, setupSessionListeners, clearCallState]);

  const hangupCall = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session) return;

    try {
      switch (session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session.cancel) await session.cancel();
          else if (session.reject) await session.reject();
          break;
        case SessionState.Established:
          await session.bye();
          break;
      }
    } catch (error) {
      console.error('Error hanging up call:', error);
      toast.error('Failed to hangup');
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session) return;

    try {
      const pc = session.sessionDescriptionHandler?.peerConnection;
      if (pc) {
        const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (audioSender?.track) {
          const newMutedState = !isMuted;
          audioSender.track.enabled = !newMutedState;
          setIsMuted(newMutedState);
          toast.success(newMutedState ? 'Muted' : 'Unmuted');
        }
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to toggle mute');
    }
  }, [isMuted]);

  const toggleHold = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session) return;

    try {
      await session.invite({
        sessionDescriptionHandlerOptions: { hold: !isHeld }
      });
      setIsHeld(!isHeld);
      toast.success(isHeld ? 'Call resumed' : 'Call on hold');
    } catch (error) {
      console.error('Error toggling hold:', error);
      toast.error('Failed to toggle hold');
    }
  }, [isHeld]);

  const sendDTMF = useCallback((tone) => {
    const session = currentSessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    try {
      session.info({
        requestOptions: {
          body: {
            contentDisposition: 'render',
            contentType: 'application/dtmf-relay',
            content: `Signal=${tone}\r\nDuration=100`
          }
        }
      });
    } catch (error) {
      console.error('Error sending DTMF:', error);
    }
  }, []);






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
          if (shouldDisposition) handleDisposition('nd');
          updateStatus('Idle');
        }
      } else {
        setFormattedStateTime(formatTime(Math.max(0, elapsedTime)));
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [pbxDetails, shouldDisposition, handleDisposition, updateStatus]);


  useEffect(() => {
    callAnsweredSoundRef.current = new Audio('/incoming-call.mp3');
    callAnsweredSoundRef.current.volume = 0.8;
    ringingToneRef.current = new Audio('/outbound-ring.mp3');
    ringingToneRef.current.volume = 0.8;
    ringingToneRef.current.loop = true;

    return () => {
      if (callAnsweredSoundRef.current) callAnsweredSoundRef.current.pause();
      if (ringingToneRef.current) ringingToneRef.current.pause();
    };
  }, []);


  useEffect(() => {
    requestAudioPermissions();
    const handleDeviceChange = () => refreshAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [requestAudioPermissions, refreshAudioDevices]);


  useEffect(() => {
    if (user?.userId && !wsRef.current) connectWebSocket();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [user?.userId, connectWebSocket]);


  useEffect(() => {
    const pingInterval = setInterval(sendPing, 10000);
    return () => clearInterval(pingInterval);
  }, [sendPing]);


  useEffect(() => {

    if (isConfigured.current) {
      console.log('SIP already configured, skipping');
      return;
    }


    if (!dbUser?.agent_id || !dbUser?.sip_password) {
      console.log('Missing SIP credentials');
      return;
    }


    if (!audioPermissionGranted) {
      console.log('Waiting for audio permission');
      return;
    }


    isConfigured.current = true;
    sipShouldReconnect.current = true;
    sipReconnectAttempts.current = 0;
    console.log('Configuring SIP UserAgent');


    const remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.id = 'sip-remote-audio';
    document.body.appendChild(remoteAudio);
    remoteAudioRef.current = remoteAudio;

    const storedOutput = localStorage.getItem('selectedOutputDevice');
    if (storedOutput && remoteAudio.setSinkId) {
      remoteAudio.setSinkId(storedOutput).catch(console.error);
    }


    const uri = UserAgent.makeURI(`sip:${dbUser.agent_id}@sip.lifeshieldmedicalalerts.com`);
    if (!uri) {
      console.error('Failed to create SIP URI');
      return;
    }


    const userAgent = new UserAgent({
      uri,
      transportOptions: {
        server: 'wss://sip.lifeshieldmedicalalerts.com:9443',
        keepAliveInterval: 15
      },
      authorizationUsername: dbUser.agent_id,
      authorizationPassword: dbUser.sip_password,
      displayName: dbUser.name || dbUser.agent_id,
      contactName: dbUser.agent_id,
      logLevel: 'error'
    });


    userAgent.delegate = {
      onInvite: (invitation) => {
        console.log('Incoming INVITE');
        handleIncomingInvite(invitation);
      }
    };


    const registerer = new Registerer(userAgent, { expires: 300 });

    registerer.stateChange.addListener((state) => {
      console.log('Registerer state:', state);
      switch (state) {
        case RegistererState.Registered:
          setSipState('registered');
          sipReconnectAttempts.current = 0;
          break;
        case RegistererState.Unregistered:
          setSipState('connected');
          break;
        case RegistererState.Terminated:
          setSipState('disconnected');
          break;
      }
    });


    userAgentRef.current = userAgent;
    registererRef.current = registerer;


    const attemptConnect = async () => {
      if (!sipShouldReconnect.current) {
        console.log('SIP: reconnect disabled, not attempting');
        return;
      }

      try {
        setSipState('connecting');
        console.log('SIP: Starting UserAgent...');
        await userAgent.start();
        console.log('SIP: UserAgent started, registering...');
        await registerer.register();
        console.log('SIP: Registered successfully');

      } catch (error) {
        console.error('SIP connection error:', error);
        setSipState('disconnected');
        setSipError(error.message);


        if (sipShouldReconnect.current) {
          const attempt = sipReconnectAttempts.current;
          const delay = attempt === 0 ? 100 : Math.min(2000 * Math.pow(2, attempt - 1), 30000);
          sipReconnectAttempts.current++;

          console.log(`SIP: reconnect attempt ${attempt + 1} in ${delay}ms`);

          sipReconnectTimeout.current = setTimeout(() => {
            if (sipShouldReconnect.current) {
              attemptConnect();
            }
          }, delay);
        }
      }
    };


    let isReconnecting = false;
    const originalOnDisconnect = userAgent.transport.onDisconnect;
    userAgent.transport.onDisconnect = (error) => {
      console.log('SIP Transport disconnected:', error?.message || 'unknown');

      if (originalOnDisconnect) {
        originalOnDisconnect(error);
      }


      if (isReconnecting) {
        console.log('SIP: Already reconnecting, ignoring disconnect');
        return;
      }

      setSipState('disconnected');


      if (sipShouldReconnect.current) {
        const attempt = sipReconnectAttempts.current;
        const delay = attempt === 0 ? 100 : Math.min(2000 * Math.pow(2, attempt - 1), 30000);
        sipReconnectAttempts.current++;

        console.log(`SIP: transport disconnect, reconnect attempt ${attempt + 1} in ${delay}ms`);

        if (sipReconnectTimeout.current) {
          clearTimeout(sipReconnectTimeout.current);
        }

        isReconnecting = true;
        sipReconnectTimeout.current = setTimeout(async () => {
          if (!sipShouldReconnect.current) {
            isReconnecting = false;
            return;
          }

          try {
            console.log('SIP: Attempting reconnect...');
            setSipState('connecting');
            await userAgent.reconnect();
            console.log('SIP: Reconnected re-registering...');
            await registerer.register();
            console.log('SIP: Re-register complete state:', registerer.state);
            sipReconnectAttempts.current = 0;

            if (registerer.state === RegistererState.Registered) {
              setSipState('registered');
            }



            if (currentSessionRef.current && currentSessionRef.current.state === SessionState.Established) {
              console.log('SIP: Active call detected, sending session refresh...');
              try {
                await currentSessionRef.current.invite();
                console.log('SIP: Session refresh sent');
              } catch (refreshErr) {
                console.warn('SIP: Session refresh failed (call may still work):', refreshErr.message);
              }
            }
          } catch (err) {
            console.error('SIP reconnect failed:', err);

          } finally {
            isReconnecting = false;
          }
        }, delay);
      }
    };


    attemptConnect();


    return () => {
      console.log('Unmounting and cleaning up SIP');
      sipShouldReconnect.current = false;

      if (sipReconnectTimeout.current) {
        clearTimeout(sipReconnectTimeout.current);
      }

      const audio = document.getElementById('sip-remote-audio');
      if (audio) audio.remove();

      if (registererRef.current) {
        registererRef.current.unregister().catch(() => { });
      }
      if (userAgentRef.current) {
        userAgentRef.current.stop().catch(() => { });
      }

      userAgentRef.current = null;
      registererRef.current = null;
    };
  }, [dbUser?.agent_id, dbUser?.sip_password, audioPermissionGranted]);

  const contextValue = {
    sipError, sipState, callState,
    sipReady: sipState === 'registered' || sipState === 'connected',
    sipConnecting: sipState === 'connecting',
    callerNumber, currentCallUUID, currentQueueName, currentCallIsOutbound,
    makeCall, hangupCall, toggleMute, toggleHold, sendDTMF, isHeld, isMuted,
    shouldDisposition, handleDisposition, handleDispositionAndCallBack, canCallBack, setCanCallBack,
    scriptData, productOfferings, campaignSettings, matchedContacts, customerData, updateCustomerData, debouncedUpdate,
    wsConnected, updateStatus, pbxDetails, formattedStateTime,
    audioDevices, selectedInputDevice, selectedOutputDevice, audioPermissionGranted,
    requestAudioPermissions, refreshAudioDevices, applyAudioDevices,
    currentCall: callState === CallState.ESTABLISHED ? currentSessionRef.current : null,
    incomingCall: callState === CallState.RINGING_IN ? { callerNumber } : null,
    answerCall: () => { },
    rejectCall: hangupCall
  };

  return (
    <ContactCenterContext.Provider value={contextValue}>
      {children}
    </ContactCenterContext.Provider>
  );
}

export function useContactCenter() {
  const context = useContext(ContactCenterContext);
  if (!context) throw new Error('useContactCenter must be used within a ContactCenterProvider');
  return context;
}

export { CallState };