export async function GET() {
  const appUrl = process.env.APP_URL;

  const config = {
    config: {
      version: "0.0.0",
      name: "Frames v2 Demo",
      icon: new URL("/icon.png", appUrl).toString(),
      splashImage: new URL("/splash.png", appUrl).toString(),
      splashBackgroundColor: "#f7f7f7",
      homeUrl: appUrl,
      fid: 0,
      key: "",
      signature: "",
    },
  };

  return Response.json(config);
}
