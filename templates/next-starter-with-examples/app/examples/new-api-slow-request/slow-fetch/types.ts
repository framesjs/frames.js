export type RandomNumberRequestStateValue =
  | {
      error: string;
      status: "error";
      timestamp: number;
    }
  | {
      data: number;
      status: "success";
      timestamp: number;
    }
  | {
      status: "pending";
      timestamp: number;
    };
