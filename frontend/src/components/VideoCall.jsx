import { useState, useEffect, useRef } from 'react';
import { meetingsAPI } from '../api/meetings';
import Button from './ui/Button';
import Badge from './ui/Badge';
import {
  HiOutlinePhone,
  HiOutlineMicrophone,
  HiOutlineVideoCamera,
  HiOutlineUserGroup
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import './VideoCall.css';

export default function VideoCall({ meetingId, onEnd }) {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const clientRef = useRef(null);
  const localTrackRef = useRef({ audioTrack: null, videoTrack: null });
  const containerRef = useRef(null);

  useEffect(() => {
    fetchToken();
    return () => { leaveCall(); };
  }, [meetingId]);

  useEffect(() => {
    let interval;
    if (joined) {
      fetchParticipants();
      interval = setInterval(fetchParticipants, 5000);
    }
    return () => clearInterval(interval);
  }, [joined, meetingId]);

  const fetchToken = async () => {
    try {
      const { data } = await meetingsAPI.getCallToken(meetingId);
      setTokenData(data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to get call token');
      onEnd();
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data } = await meetingsAPI.getParticipants(meetingId);
      setParticipants(data);
      
      // Update video labels with names if available
      data.forEach(p => {
        const label = document.getElementById(`label-${p.agora_uid}`);
        if (label) {
          label.innerText = p.email;
        }
      });
    } catch (err) {
      // silent fail for polling
    }
  };

  const joinCall = async (withVideo = true) => {
    if (!tokenData) return;
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      await client.join(
        tokenData.app_id,
        tokenData.channel_name,
        tokenData.token,
        tokenData.uid
      );

      let audioTrack = null;
      let videoTrack = null;

      if (withVideo) {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      } else {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }

      localTrackRef.current = { audioTrack, videoTrack };

      if (videoTrack && containerRef.current) {
        videoTrack.play(containerRef.current);
      }

      const tracksToPublish = [audioTrack];
      if (videoTrack) tracksToPublish.push(videoTrack);

      await client.publish(tracksToPublish);
      setJoined(true);
      setVideoMuted(!withVideo);

      // Handle remote users
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          const remoteContainer = document.getElementById(`remote-${user.uid}`);
          if (!remoteContainer) {
            const div = document.createElement('div');
            div.id = `remote-${user.uid}`;
            div.className = 'remote-video';
            
            const label = document.createElement('div');
            label.id = `label-${user.uid}`;
            label.className = 'remote-video-label';
            // Try to find name immediately if we already fetched it
            const p = participants.find(p => p.agora_uid === user.uid);
            label.innerText = p ? p.email : `User ${user.uid}`;
            
            div.appendChild(label);
            document.getElementById('remote-videos')?.appendChild(div);
          }
          user.videoTrack?.play(`remote-${user.uid}`);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });
      
      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
           const remoteContainer = document.getElementById(`remote-${user.uid}`);
           if (remoteContainer) remoteContainer.remove();
        }
      });

      toast.success('Joined call!');
    } catch (err) {
      toast.error('Failed to join: ' + err.message);
    }
  };

  const leaveCall = async () => {
    const { audioTrack, videoTrack } = localTrackRef.current;
    if (audioTrack) { audioTrack.close(); }
    if (videoTrack) { videoTrack.close(); }
    if (clientRef.current) {
      await clientRef.current.leave();
    }
    setJoined(false);
  };

  const toggleAudio = () => {
    const { audioTrack } = localTrackRef.current;
    if (audioTrack) {
      audioTrack.setEnabled(audioMuted);
      setAudioMuted(!audioMuted);
    }
  };

  const toggleVideo = async () => {
    let { videoTrack } = localTrackRef.current;
    if (videoTrack) {
      videoTrack.setEnabled(videoMuted);
      setVideoMuted(!videoMuted);
    } else {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTrackRef.current.videoTrack = videoTrack;
        if (containerRef.current) {
          videoTrack.play(containerRef.current);
        }
        if (clientRef.current) {
          await clientRef.current.publish([videoTrack]);
        }
        setVideoMuted(false);
      } catch (err) {
        toast.error('Could not access camera');
      }
    }
  };

  const handleEnd = async () => {
    await leaveCall();
    onEnd();
  };

  if (loading) {
    return (
      <div className="call-container">
        <div className="spinner" />
        <p>Connecting to call...</p>
      </div>
    );
  }

  return (
    <div className={`call-container animate-fade-in ${showParticipants ? 'with-sidebar' : ''}`}>
      <div className="call-main">
        <div className="call-header">
          <h2>Meeting Call</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {joined && (
              <Button variant="secondary" size="sm" icon={<HiOutlineUserGroup />} onClick={() => setShowParticipants(!showParticipants)}>
                Participants
              </Button>
            )}
            <Button variant="danger" size="sm" icon={<HiOutlinePhone />} onClick={handleEnd}>
              End Call
            </Button>
          </div>
        </div>

        <div className="call-videos">
          <div ref={containerRef} className="local-video">
            {!joined && (
              <div className="call-preview">
                <p>Ready to join?</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                  <Button onClick={() => joinCall(true)}>Join with Video</Button>
                  <Button variant="secondary" onClick={() => joinCall(false)}>Join without Camera</Button>
                </div>
              </div>
            )}
            {joined && <div className="remote-video-label">You</div>}
          </div>
          <div id="remote-videos" className="remote-videos-grid" />
        </div>

        {joined && (
          <div className="call-controls">
            <button
              className={`call-ctrl ${audioMuted ? 'call-ctrl-off' : ''}`}
              onClick={toggleAudio}
              title={audioMuted ? 'Unmute' : 'Mute'}
            >
              <HiOutlineMicrophone />
            </button>
            <button
              className={`call-ctrl ${videoMuted ? 'call-ctrl-off' : ''}`}
              onClick={toggleVideo}
              title={videoMuted ? 'Turn on camera' : 'Turn off camera'}
            >
              <HiOutlineVideoCamera />
            </button>
            <button className="call-ctrl call-ctrl-end" onClick={handleEnd}>
              <HiOutlinePhone />
            </button>
          </div>
        )}
      </div>
      
      {showParticipants && (
        <div className="participants-sidebar animate-fade-in">
          <div className="participants-header">
            <h3>Participants ({participants.length})</h3>
            <button onClick={() => setShowParticipants(false)} className="close-btn">&times;</button>
          </div>
          <div className="participants-list">
            {participants.map(p => (
              <div key={p.agora_uid} className="participant-item">
                <div className="participant-avatar">
                  {p.email.charAt(0).toUpperCase()}
                </div>
                <div className="participant-info">
                  <div className="participant-name">
                    {p.email} {p.agora_uid === tokenData.uid && '(You)'}
                  </div>
                  <Badge variant={p.role === 'host' ? 'primary' : 'secondary'} size="sm">
                    {p.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
