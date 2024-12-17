export function validateAuth(req: Request) {
  const fid = req.headers.get("x-fid");
  const frameAppUrl = req.headers.get("x-frame-url");

  if (!fid || !frameAppUrl) {
    return false;
  }

  return {
    fid,
    frameAppUrl,
  };
}
