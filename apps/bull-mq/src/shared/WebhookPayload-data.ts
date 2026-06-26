// thiết kế để làm payload 
export interface WebhookPayload {
  pbxSuffix?: string;
  eventId: string;
  eventType: 'ringing' | 'answered' | 'hangup' | 'misscall' | 'completed';
  caller: string;
  callee: string;
  timestamp: string;
  meta: {
    callId: string;
    call: {
      uniqueid: string;
      fromnumber: string;
      calltype: string;
      channel: string;
      extension: string;
      starttime: string;
      status: 'initiating' | 'answered' | 'hangup' | 'misscall' | 'completed' | (string & {});
      destination: string;
      did: string;
      callrefid: string;
      linkedid: string;
      groupid?: string;
      connector_server?: string;  
      tonumber: string;
      destchannel: string;
      answertime?: string;              
      endtime?: string;                 
      duration?: number;  
      billsec?: number;        
      disposition?: string;             
      recording_file?: string;         
    };
  };
}
