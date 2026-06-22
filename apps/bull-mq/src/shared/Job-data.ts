export type JobData = {
  url: string;
  params: {
    caller: string;
    callee: string;
    meta: {
      callId: string;
      call: { starttime: string, connector_server: string };
    };
  };
};