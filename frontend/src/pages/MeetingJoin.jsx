import { useParams } from 'react-router-dom';
import VideoCall from '../components/VideoCall';
import { useNavigate } from 'react-router-dom';

export default function MeetingJoin() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  return (
    <VideoCall
      meetingId={meetingId}
      onEnd={() => navigate('/meetings')}
    />
  );
}
